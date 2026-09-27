import { aliasedTable, and, asc, count, desc, eq, ne, sql, type SQL } from "drizzle-orm";

import { orderReference } from "@/lib/admin";
import { toFieldErrors } from "@/lib/auth-schemas";
import {
  createTicketSchema,
  replySchema,
  ticketReference,
  type CreateTicketInput,
  type SupportOrderOption,
  type TicketDetail,
  type TicketStatus,
  type TicketSummary,
} from "@/lib/support";

import { isRateLimited, recordAttempt, type RateLimitRule } from "../auth/rate-limit";
import type { SessionUser } from "../auth/session";
import { getDb } from "../db/client";
import { accounts, orders, supportMessages, supportTickets, users } from "../db/schema";

/**
 * Suporte (tickets). Regras:
 *  - o cliente só vê/responde aos SEUS tickets e só liga tickets a pedidos SEUS;
 *  - o admin vê todos (as funções de admin verificam o papel antes de chegar aqui);
 *  - awaitingAdmin = a última mensagem é do cliente → aparece como "por responder".
 */

export type SupportResult<T = null> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const NEW_TICKETS: RateLimitRule = { limit: 5, windowSeconds: 60 * 60 };
const REPLIES: RateLimitRule = { limit: 30, windowSeconds: 60 * 60 };
const TOO_MANY = "Enviou muitas mensagens em pouco tempo. Tente novamente mais tarde.";

const customer = aliasedTable(users, "customer");
const author = aliasedTable(users, "author");

// Nº de mensagens por ticket (subconsulta com nomes explícitos: ver nota em admin/accounts.ts).
const messagesCount = sql<number>`(
  select count(*)::int from support_messages sm where sm.ticket_id = ${supportTickets.id}
)`;

async function selectSummaries(where: SQL | undefined, limit = 300): Promise<TicketSummary[]> {
  const rows = await getDb()
    .select({
      id: supportTickets.id,
      number: supportTickets.number,
      subject: supportTickets.subject,
      status: supportTickets.status,
      awaitingAdmin: supportTickets.awaitingAdmin,
      lastMessageAt: supportTickets.lastMessageAt,
      createdAt: supportTickets.createdAt,
      orderNumber: orders.number,
      customerName: customer.name,
      customerEmail: customer.email,
      messagesCount,
    })
    .from(supportTickets)
    .innerJoin(customer, eq(supportTickets.userId, customer.id))
    .leftJoin(orders, eq(supportTickets.orderId, orders.id))
    .where(where)
    .orderBy(desc(supportTickets.lastMessageAt))
    .limit(limit);

  return rows.map(({ number, orderNumber, ...row }) => ({
    ...row,
    reference: ticketReference(number),
    orderReference: orderNumber ? orderReference(orderNumber) : null,
    lastMessageAt: row.lastMessageAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }));
}

async function selectDetail(ticketId: string): Promise<TicketDetail | null> {
  const db = getDb();
  const [ticket] = await db
    .select({ userId: supportTickets.userId, orderId: supportTickets.orderId })
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId));
  if (!ticket) return null;

  const [summary] = await selectSummaries(eq(supportTickets.id, ticketId), 1);
  if (!summary) return null;

  let order: TicketDetail["order"] = null;
  if (ticket.orderId) {
    const [row] = await db
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        amountCents: orders.amountCents,
        accountId: accounts.id,
        accountTitle: accounts.title,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(accounts, eq(orders.accountId, accounts.id))
      .where(eq(orders.id, ticket.orderId));
    if (row) {
      order = {
        id: row.id,
        reference: orderReference(row.number),
        status: row.status,
        amountCents: row.amountCents,
        accountId: row.accountId,
        accountTitle: row.accountTitle,
        createdAt: row.createdAt.toISOString(),
      };
    }
  }

  const messages = await db
    .select({
      id: supportMessages.id,
      fromAdmin: supportMessages.fromAdmin,
      authorName: author.name,
      body: supportMessages.body,
      createdAt: supportMessages.createdAt,
    })
    .from(supportMessages)
    .innerJoin(author, eq(supportMessages.authorId, author.id))
    .where(eq(supportMessages.ticketId, ticketId))
    .orderBy(asc(supportMessages.createdAt));

  return {
    ...summary,
    userId: ticket.userId,
    order,
    messages: messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------- cliente

/** Pedidos do próprio cliente, para ligar ao ticket. */
export async function listSupportOrderOptions(user: SessionUser): Promise<SupportOrderOption[]> {
  const rows = await getDb()
    .select({
      id: orders.id,
      number: orders.number,
      accountTitle: accounts.title,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(accounts, eq(orders.accountId, accounts.id))
    .where(and(eq(orders.userId, user.id), ne(orders.status, "CANCELLED")))
    .orderBy(desc(orders.createdAt))
    .limit(50);
  return rows.map(({ number, ...row }) => ({ ...row, reference: orderReference(number) }));
}

export async function createTicket(
  user: SessionUser,
  raw: CreateTicketInput,
): Promise<SupportResult<{ id: string }>> {
  const parsed = createTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique o formulário.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }
  const { topic, orderId, message } = parsed.data;

  const key = `support:new:${user.id}`;
  if (await isRateLimited(key, NEW_TICKETS)) return { ok: false, error: TOO_MANY };

  const db = getDb();
  if (orderId) {
    // Só pedidos do próprio cliente (não confiar no id enviado pelo browser).
    const [own] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)));
    if (!own) {
      return { ok: false, error: "Pedido inválido.", fieldErrors: { orderId: "Pedido inválido" } };
    }
  }

  const id = await db.transaction(async (tx) => {
    const [ticket] = await tx
      .insert(supportTickets)
      .values({ userId: user.id, orderId, subject: topic })
      .returning({ id: supportTickets.id });
    if (!ticket) throw new Error("Falha ao criar ticket");
    await tx
      .insert(supportMessages)
      .values({ ticketId: ticket.id, authorId: user.id, fromAdmin: false, body: message });
    return ticket.id;
  });
  await recordAttempt(key, NEW_TICKETS);
  return { ok: true, data: { id } };
}

export async function listMyTickets(user: SessionUser): Promise<TicketSummary[]> {
  return selectSummaries(eq(supportTickets.userId, user.id), 100);
}

/** Ticket do próprio cliente; o de outra pessoa "não existe" para ele. */
export async function getMyTicket(
  user: SessionUser,
  ticketId: string,
): Promise<TicketDetail | null> {
  const detail = await selectDetail(ticketId);
  return detail && detail.userId === user.id ? detail : null;
}

async function addMessage(
  sender: SessionUser,
  asAdmin: boolean,
  raw: { ticketId: string; message: string },
  newStatus?: TicketStatus,
): Promise<SupportResult> {
  const parsed = replySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Mensagem inválida.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { ticketId, message } = parsed.data;

  const key = `support:reply:${sender.id}`;
  if (!asAdmin && (await isRateLimited(key, REPLIES))) return { ok: false, error: TOO_MANY };

  const result = await getDb().transaction(async (tx) => {
    const [ticket] = await tx
      .select({ userId: supportTickets.userId, status: supportTickets.status })
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .for("update");
    if (!ticket || (!asAdmin && ticket.userId !== sender.id)) return false;

    await tx
      .insert(supportMessages)
      .values({ ticketId, authorId: sender.id, fromAdmin: asAdmin, body: message });

    const status: TicketStatus = asAdmin
      ? (newStatus ?? (ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status))
      : ticket.status === "CLOSED"
        ? "OPEN" // o cliente respondeu a um ticket fechado → reabre
        : ticket.status;

    await tx
      .update(supportTickets)
      .set({
        status,
        awaitingAdmin: !asAdmin && status !== "CLOSED",
        lastMessageAt: new Date(),
      })
      .where(eq(supportTickets.id, ticketId));
    return true;
  });

  if (!result) return { ok: false, error: "Ticket não encontrado." };
  if (!asAdmin) await recordAttempt(key, REPLIES);
  return { ok: true, data: null };
}

export function replyAsCustomer(user: SessionUser, raw: { ticketId: string; message: string }) {
  return addMessage(user, false, raw);
}

// ---------------------------------------------------------------- admin

export async function listTicketsAdmin(filters: {
  status?: TicketStatus | undefined;
  awaiting?: boolean | undefined;
  q?: string | undefined;
}): Promise<TicketSummary[]> {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(supportTickets.status, filters.status));
  if (filters.awaiting) {
    conditions.push(eq(supportTickets.awaitingAdmin, true), ne(supportTickets.status, "CLOSED"));
  }
  if (filters.q) {
    const pattern = `%${filters.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const digits = filters.q.replace(/\D/g, "");
    conditions.push(
      sql`(${customer.name} ilike ${pattern} or ${customer.email} ilike ${pattern} or ${supportTickets.subject} ilike ${pattern}${
        digits ? sql` or ${supportTickets.number}::text = ${String(Number(digits))}` : sql``
      })`,
    );
  }
  return selectSummaries(conditions.length ? and(...conditions) : undefined);
}

export function getTicketAdmin(ticketId: string) {
  return selectDetail(ticketId);
}

export function replyAsAdmin(
  admin: SessionUser,
  raw: { ticketId: string; message: string },
  status?: TicketStatus,
) {
  return addMessage(admin, true, raw, status);
}

export async function setTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<SupportResult> {
  const updated = await getDb()
    .update(supportTickets)
    .set({ status, ...(status === "CLOSED" ? { awaitingAdmin: false } : {}) })
    .where(eq(supportTickets.id, ticketId))
    .returning({ id: supportTickets.id });
  return updated.length ? { ok: true, data: null } : { ok: false, error: "Ticket não encontrado." };
}

/** Tickets à espera de resposta (contador do menu do admin). */
export async function countAwaitingTickets(): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(supportTickets)
    .where(and(eq(supportTickets.awaitingAdmin, true), ne(supportTickets.status, "CLOSED")));
  return row?.n ?? 0;
}
