import { and, count, desc, eq, ne, sql } from "drizzle-orm";

import { orderReference, type OrderStatus } from "@/lib/admin";

import type { SessionUser } from "../auth/session";
import { decryptCredentials, type AccountCredentials } from "../crypto/credentials";
import { getDb } from "../db/client";
import {
  accountCredentials,
  accounts,
  credentialAccessLogs,
  orders,
  supportTickets,
} from "../db/schema";

/**
 * Área de cliente: as compras do PRÓPRIO utilizador e a entrega das credenciais.
 * Tudo filtrado pelo id do utilizador da sessão — nunca por ids vindos do browser.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MyOrder {
  id: string;
  reference: string;
  status: OrderStatus;
  amountCents: number;
  createdAt: string;
  paidAt: string | null;
  accountId: string;
  accountTitle: string;
  accountLevel: number;
  accountServer: string;
  coverUrl: string | null;
  /** Os dados da conta podem ser revelados (pago + conta vendida a este pedido). */
  credentialsReady: boolean;
}

export interface MyOrderDetail extends MyOrder {
  accountSkins: number;
  accountEvolutionWeapons: number;
  views: number;
  lastViewedAt: string | null;
}

// Subconsultas com nomes explícitos (ver nota em admin/accounts.ts).
const coverUrl = sql<string | null>`(
  select ai.url from account_images ai where ai.account_id = ${orders.accountId}
  order by ai.position asc, ai.created_at asc limit 1
)`;

function thumb(url: string | null) {
  return url?.includes("/image/upload/")
    ? url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_fill,w_320,h_200/")
    : url;
}

const baseColumns = {
  id: orders.id,
  number: orders.number,
  userId: orders.userId,
  status: orders.status,
  amountCents: orders.amountCents,
  createdAt: orders.createdAt,
  paidAt: orders.paidAt,
  accountId: accounts.id,
  accountTitle: accounts.title,
  accountLevel: accounts.level,
  accountServer: accounts.server,
  accountStatus: accounts.status,
  accountSkins: accounts.skins,
  accountEvolutionWeapons: accounts.evolutionWeapons,
  coverUrl,
};

type Row = {
  id: string;
  number: number;
  status: OrderStatus;
  amountCents: number;
  createdAt: Date;
  paidAt: Date | null;
  accountId: string;
  accountTitle: string;
  accountLevel: number;
  accountServer: string;
  accountStatus: string;
  coverUrl: string | null;
};

function toMyOrder(row: Row): MyOrder {
  return {
    id: row.id,
    reference: orderReference(row.number),
    status: row.status,
    amountCents: row.amountCents,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    accountId: row.accountId,
    accountTitle: row.accountTitle,
    accountLevel: row.accountLevel,
    accountServer: row.accountServer,
    coverUrl: thumb(row.coverUrl),
    credentialsReady: row.status === "PAID" && row.accountStatus === "SOLD",
  };
}

/** Compras do cliente (checkouts abandonados/cancelados não aparecem). */
export async function listMyOrders(user: SessionUser): Promise<MyOrder[]> {
  const rows = await getDb()
    .select(baseColumns)
    .from(orders)
    .innerJoin(accounts, eq(orders.accountId, accounts.id))
    .where(and(eq(orders.userId, user.id), ne(orders.status, "CANCELLED")))
    .orderBy(desc(orders.createdAt))
    .limit(200);
  return rows.map(toMyOrder);
}

export async function getMyOrder(
  user: SessionUser,
  orderId: string,
): Promise<MyOrderDetail | null> {
  if (!UUID.test(orderId)) return null;
  const db = getDb();
  const [row] = await db
    .select(baseColumns)
    .from(orders)
    .innerJoin(accounts, eq(orders.accountId, accounts.id))
    .where(eq(orders.id, orderId));
  // Pedido de outra pessoa "não existe" para quem pergunta.
  if (!row || row.userId !== user.id) return null;

  const [views] = await db
    .select({
      n: count(),
      last: sql<Date | null>`max(${credentialAccessLogs.createdAt})`,
    })
    .from(credentialAccessLogs)
    .where(
      and(eq(credentialAccessLogs.orderId, orderId), eq(credentialAccessLogs.userId, user.id)),
    );

  return {
    ...toMyOrder(row),
    accountSkins: row.accountSkins,
    accountEvolutionWeapons: row.accountEvolutionWeapons,
    views: views?.n ?? 0,
    lastViewedAt: views?.last ? new Date(views.last).toISOString() : null,
  };
}

export type RevealResult =
  | { ok: true; credentials: AccountCredentials }
  | { ok: false; status: 401 | 403 | 404 | 409; error: string };

/**
 * Entrega das credenciais (plano.md → "Revelação das credenciais").
 * Verifica: 1) sessão  2) pedido existe  3) pedido é do utilizador  4) pedido PAGO
 *           5) a conta é a deste pedido  6) conta VENDIDA  — e regista o acesso.
 */
export async function revealCredentials(
  user: SessionUser | null,
  orderId: string,
  meta: { ip: string | null; userAgent: string | null },
): Promise<RevealResult> {
  if (!user) return { ok: false, status: 401, error: "Sessão expirada. Entre novamente." };
  if (!UUID.test(orderId)) return { ok: false, status: 404, error: "Pedido não encontrado." };

  const db = getDb();
  const [order] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      status: orders.status,
      accountId: orders.accountId,
    })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!order) return { ok: false, status: 404, error: "Pedido não encontrado." };
  if (order.userId !== user.id) {
    console.warn(`[credenciais] ${user.email} tentou aceder ao pedido ${orderId} de outra pessoa`);
    return { ok: false, status: 403, error: "Não tem acesso a este pedido." };
  }
  if (order.status !== "PAID") {
    return {
      ok: false,
      status: 409,
      error: "Os dados ficam disponíveis depois de o pagamento ser confirmado.",
    };
  }

  const [account] = await db
    .select({ status: accounts.status })
    .from(accounts)
    .where(eq(accounts.id, order.accountId));
  // A venda desta conta tem de ser ESTE pedido (índice único: 1 pedido PAGO por conta).
  const [sale] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.accountId, order.accountId), eq(orders.status, "PAID")));
  if (account?.status !== "SOLD" || sale?.id !== order.id) {
    return {
      ok: false,
      status: 409,
      error: "Esta compra não está disponível. Contacte o suporte.",
    };
  }

  const [encrypted] = await db
    .select()
    .from(accountCredentials)
    .where(eq(accountCredentials.accountId, order.accountId));
  if (!encrypted) {
    console.error(
      `[credenciais] conta ${order.accountId} vendida SEM credenciais (pedido ${orderId})`,
    );
    return {
      ok: false,
      status: 409,
      error: "Os dados desta conta ainda não estão prontos. Contacte o suporte.",
    };
  }

  const credentials = decryptCredentials(order.accountId, encrypted);
  await db.insert(credentialAccessLogs).values({
    userId: user.id,
    orderId: order.id,
    ipAddress: meta.ip,
    userAgent: meta.userAgent?.slice(0, 512) ?? null,
  });
  return { ok: true, credentials };
}

export interface MyDashboard {
  purchases: number;
  totalSpentCents: number;
  lastPurchase: { amountCents: number; paidAt: string } | null;
  openTickets: number;
  recent: MyOrder[];
}

export async function getMyDashboard(user: SessionUser): Promise<MyDashboard> {
  const db = getDb();
  const [paid] = await db
    .select({
      n: count(),
      total: sql<number>`coalesce(sum(${orders.amountCents}), 0)::int`,
    })
    .from(orders)
    .where(and(eq(orders.userId, user.id), eq(orders.status, "PAID")));
  const [last] = await db
    .select({ amountCents: orders.amountCents, paidAt: orders.paidAt })
    .from(orders)
    .where(and(eq(orders.userId, user.id), eq(orders.status, "PAID")))
    .orderBy(desc(orders.paidAt))
    .limit(1);
  const [tickets] = await db
    .select({ n: count() })
    .from(supportTickets)
    .where(and(eq(supportTickets.userId, user.id), ne(supportTickets.status, "CLOSED")));

  return {
    purchases: paid?.n ?? 0,
    totalSpentCents: paid?.total ?? 0,
    lastPurchase: last?.paidAt
      ? { amountCents: last.amountCents, paidAt: last.paidAt.toISOString() }
      : null,
    openTickets: tickets?.n ?? 0,
    recent: (await listMyOrders(user)).slice(0, 5),
  };
}
