import { randomUUID } from "node:crypto";

import { and, asc, eq, gt, inArray, ne, notInArray } from "drizzle-orm";

import { orderReference, type OrderStatus } from "@/lib/admin";

import type { SessionUser } from "../auth/session";
import { getDb } from "../db/client";
import { accountImages, accounts, orders } from "../db/schema";
import { serverEnv } from "../env";
import { checkoutBranding } from "./branding";
import { getStripe, type Stripe } from "./stripe";

/**
 * Fluxo de compra (plano.md), com carrinho:
 *  1. startCheckout: reserva TODAS as contas do carrinho (atómico) + cria um pedido PENDING
 *     por conta (mesmo checkout_group_id) + UMA sessão Stripe Checkout.
 *  2. O pagamento só é confirmado com dados vindos DO STRIPE (webhook assinado ou consulta
 *     servidor→Stripe com a chave secreta). O redirect /compra/sucesso é só interface.
 *  3. markCheckoutPaid: pedidos PAID + contas SOLD numa transação (idempotente). Uma conta
 *     que já não possa ser entregue → esse pedido fica FAILED e é reembolsado (parcialmente).
 */

/** O Stripe exige que a sessão expire ≥ 30 min depois de criada. */
const CHECKOUT_TTL_MS = 31 * 60 * 1000;
/** Margem para webhooks de pagamentos concluídos mesmo no fim da sessão. */
const RESERVATION_GRACE_MS = 5 * 60 * 1000;
export const MAX_CART_ITEMS = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export type StartCheckoutResult =
  { ok: true; url: string } | { ok: false; error: string; unavailable?: string[] };

class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly unavailable: string[] = [],
  ) {
    super(message);
  }
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  return typeof pi === "string" ? pi : (pi?.id ?? null);
}

async function expireSessions(sessionIds: string[]) {
  const stripe = getStripe();
  await Promise.all(
    [...new Set(sessionIds)].map(async (id) => {
      try {
        await stripe.checkout.sessions.expire(id);
      } catch {
        // Já expirada ou concluída: nada a fazer.
      }
    }),
  );
}

function isConcurrencyConflict(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  const code = e?.code ?? e?.cause?.code;
  return code === "40P01" || code === "40001" || code === "23505";
}

interface PreparedItem {
  orderId: string;
  orderNumber: number;
  accountId: string;
  title: string;
  amountCents: number;
  currency: string;
  cover: string | null;
}

export async function startCheckout(
  user: SessionUser,
  rawAccountIds: string[],
): Promise<StartCheckoutResult> {
  // Ordem fixa das contas = ordem fixa dos bloqueios → dois carrinhos com contas em comum
  // não se bloqueiam mutuamente (sem deadlocks).
  const accountIds = [...new Set(rawAccountIds)].filter((id) => UUID.test(id)).sort();
  if (accountIds.length === 0) return { ok: false, error: "O carrinho está vazio." };
  if (accountIds.length > MAX_CART_ITEMS) {
    return { ok: false, error: `Pode comprar até ${MAX_CART_ITEMS} contas de uma vez.` };
  }

  const db = getDb();
  const now = new Date();
  const checkoutExpiresAt = new Date(now.getTime() + CHECKOUT_TTL_MS);
  const reservedUntil = new Date(checkoutExpiresAt.getTime() + RESERVATION_GRACE_MS);

  let staleSessions: string[] = [];
  let prepared:
    { kind: "reuse"; sessionId: string } | { kind: "new"; groupId: string; items: PreparedItem[] };

  try {
    prepared = await db.transaction(async (tx) => {
      const rows = await tx
        .select({
          id: accounts.id,
          title: accounts.title,
          priceCents: accounts.priceCents,
          currency: accounts.currency,
          status: accounts.status,
          reservedUntil: accounts.reservedUntil,
        })
        .from(accounts)
        .where(inArray(accounts.id, accountIds))
        .orderBy(asc(accounts.id))
        .for("update");
      const byId = new Map(rows.map((row) => [row.id, row]));

      const pendingForAccounts = await tx
        .select({
          id: orders.id,
          userId: orders.userId,
          accountId: orders.accountId,
          groupId: orders.checkoutGroupId,
          sessionId: orders.stripeCheckoutSessionId,
        })
        .from(orders)
        .where(and(inArray(orders.accountId, accountIds), eq(orders.status, "PENDING")))
        .orderBy(asc(orders.id))
        .for("update");

      const activelyReserved = (id: string) => {
        const row = byId.get(id);
        return row?.status === "RESERVED" && row.reservedUntil !== null && row.reservedUntil > now;
      };

      // Clique repetido: o MESMO cliente já tem um checkout aberto com EXATAMENTE estas
      // contas (nem mais, nem menos) → reutiliza a mesma sessão de pagamento.
      const first = pendingForAccounts[0];
      if (
        first?.sessionId &&
        accountIds.every(activelyReserved) &&
        pendingForAccounts.length === accountIds.length &&
        pendingForAccounts.every(
          (o) =>
            o.userId === user.id && o.groupId === first.groupId && o.sessionId === first.sessionId,
        )
      ) {
        const wholeGroup = await tx
          .select({ id: orders.id })
          .from(orders)
          .where(and(eq(orders.checkoutGroupId, first.groupId), eq(orders.status, "PENDING")));
        if (wholeGroup.length === accountIds.length) {
          return { kind: "reuse" as const, sessionId: first.sessionId };
        }
      }

      const unavailable: string[] = [];
      for (const id of accountIds) {
        const row = byId.get(id);
        if (!row || row.status === "DRAFT" || row.status === "DISABLED" || row.status === "SOLD") {
          unavailable.push(id);
          continue;
        }
        const reservedByOther = pendingForAccounts.some(
          (o) => o.accountId === id && o.userId !== user.id,
        );
        if (activelyReserved(id) && reservedByOther) unavailable.push(id);
      }
      if (unavailable.length) {
        const titles = unavailable.map((id) => byId.get(id)?.title ?? "Uma conta").join(", ");
        throw new CheckoutError(
          unavailable.length === 1
            ? `${titles} já não está disponível.`
            : `Estas contas já não estão disponíveis: ${titles}.`,
          unavailable,
        );
      }

      // Um cliente só tem UM checkout em curso: cancela os anteriores dele e os checkouts
      // expirados destas contas.
      const myPending = await tx
        .select({
          id: orders.id,
          accountId: orders.accountId,
          sessionId: orders.stripeCheckoutSessionId,
        })
        .from(orders)
        .where(and(eq(orders.userId, user.id), eq(orders.status, "PENDING")))
        .orderBy(asc(orders.id))
        .for("update");

      const toCancel = [...pendingForAccounts, ...myPending];
      if (toCancel.length) {
        await tx
          .update(orders)
          .set({ status: "CANCELLED", cancelledAt: now })
          .where(inArray(orders.id, [...new Set(toCancel.map((o) => o.id))]));
        staleSessions = toCancel.flatMap((o) => (o.sessionId ? [o.sessionId] : []));
        const released = [...new Set(myPending.map((o) => o.accountId))].filter(
          (id) => !accountIds.includes(id),
        );
        if (released.length) {
          await tx
            .update(accounts)
            .set({ status: "AVAILABLE", reservedUntil: null })
            .where(and(inArray(accounts.id, released), eq(accounts.status, "RESERVED")));
        }
      }

      await tx
        .update(accounts)
        .set({ status: "RESERVED", reservedUntil })
        .where(inArray(accounts.id, accountIds));

      const groupId = randomUUID();
      const created = await tx
        .insert(orders)
        .values(
          accountIds.map((id) => {
            const row = byId.get(id)!;
            return {
              userId: user.id,
              accountId: id,
              checkoutGroupId: groupId,
              amountCents: row.priceCents, // preço SEMPRE da base de dados
              currency: row.currency,
              reservationExpiresAt: reservedUntil,
            };
          }),
        )
        .returning({ id: orders.id, number: orders.number, accountId: orders.accountId });

      const images = await tx
        .select({ accountId: accountImages.accountId, url: accountImages.url })
        .from(accountImages)
        .where(inArray(accountImages.accountId, accountIds))
        .orderBy(asc(accountImages.accountId), asc(accountImages.position));
      const covers = new Map<string, string>();
      for (const image of images)
        if (!covers.has(image.accountId)) covers.set(image.accountId, image.url);

      return {
        kind: "new" as const,
        groupId,
        items: created.map((order) => {
          const row = byId.get(order.accountId)!;
          return {
            orderId: order.id,
            orderNumber: order.number,
            accountId: order.accountId,
            title: row.title,
            amountCents: row.priceCents,
            currency: row.currency,
            cover: covers.get(order.accountId) ?? null,
          };
        }),
      };
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return { ok: false, error: error.message, unavailable: error.unavailable };
    }
    if (isConcurrencyConflict(error)) {
      return { ok: false, error: "Muitos pedidos ao mesmo tempo. Tente novamente." };
    }
    throw error;
  }

  const stripe = getStripe();
  if (staleSessions.length) await expireSessions(staleSessions);

  if (prepared.kind === "reuse") {
    const session = await stripe.checkout.sessions.retrieve(prepared.sessionId);
    if (session.status === "open" && session.url) return { ok: true, url: session.url };
    return {
      ok: false,
      error: "O seu pagamento anterior está a ser processado. Aguarde um momento.",
    };
  }

  const { APP_URL } = serverEnv();
  const { groupId, items } = prepared;
  const metadata = { groupId, userId: user.id };
  const references = items.map((item) => orderReference(item.orderNumber)).join(", ");
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        locale: "pt",
        submit_type: "pay",
        branding_settings: checkoutBranding(),
        custom_text: {
          submit: {
            message:
              "Depois do pagamento, os dados das contas ficam disponíveis na sua área de cliente da Plutão Shop.",
          },
        },
        customer_email: user.email,
        client_reference_id: groupId,
        metadata,
        payment_intent_data: {
          metadata,
          description: `Plutão Shop ${references}`.slice(0, 1000),
        },
        line_items: items.map((item) => ({
          quantity: 1,
          price_data: {
            currency: item.currency.toLowerCase(),
            unit_amount: item.amountCents,
            product_data: {
              name: item.title,
              description: "Conta digital — dados entregues na sua área de cliente.",
              ...(item.cover ? { images: [item.cover] } : {}),
            },
          },
        })),
        expires_at: Math.floor(checkoutExpiresAt.getTime() / 1000),
        success_url: `${APP_URL}/compra/sucesso?grupo=${groupId}`,
        cancel_url: `${APP_URL}/compra/cancelada?grupo=${groupId}`,
      },
      { idempotencyKey: `checkout-${groupId}` },
    );

    await db
      .update(orders)
      .set({ stripeCheckoutSessionId: session.id })
      .where(eq(orders.checkoutGroupId, groupId));

    if (!session.url) throw new Error("Sessão Stripe sem URL");
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[checkout] falha ao criar sessão Stripe", error);
    await getDb().transaction((tx) =>
      releaseOrders(tx, eq(orders.checkoutGroupId, groupId), "FAILED"),
    );
    return { ok: false, error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
}

/**
 * Fecha pedidos PENDING (cancelados/expirados/falhados) e liberta as contas
 * que não estejam reservadas por outro checkout ativo.
 */
async function releaseOrders(tx: Tx, where: ReturnType<typeof eq>, status: "CANCELLED" | "FAILED") {
  const pending = await tx
    .select({ id: orders.id, accountId: orders.accountId })
    .from(orders)
    .where(and(where, eq(orders.status, "PENDING")))
    .orderBy(asc(orders.accountId))
    .for("update");
  if (pending.length === 0) return;

  const now = new Date();
  const ids = pending.map((o) => o.id);
  await tx
    .update(orders)
    .set(status === "CANCELLED" ? { status, cancelledAt: now } : { status, failedAt: now })
    .where(inArray(orders.id, ids));

  const accountIds = [...new Set(pending.map((o) => o.accountId))];
  const stillReserved = await tx
    .select({ accountId: orders.accountId })
    .from(orders)
    .where(
      and(
        inArray(orders.accountId, accountIds),
        eq(orders.status, "PENDING"),
        notInArray(orders.id, ids),
        gt(orders.reservationExpiresAt, now),
      ),
    );
  const keep = new Set(stillReserved.map((o) => o.accountId));
  const free = accountIds.filter((id) => !keep.has(id));
  if (free.length) {
    await tx
      .update(accounts)
      .set({ status: "AVAILABLE", reservedUntil: null })
      .where(and(inArray(accounts.id, free), eq(accounts.status, "RESERVED")));
  }
}

export type FulfillmentOutcome = "paid" | "partial" | "already" | "refunded" | "ignored";

/**
 * Confirma o pagamento a partir de uma sessão VINDA DO STRIPE (webhook verificado ou
 * consulta com a chave secreta). Idempotente. Os pedidos são encontrados pelo id da
 * sessão (que vem do Stripe), nunca por dados enviados pelo browser.
 */
export async function markCheckoutPaid(
  session: Stripe.Checkout.Session,
): Promise<FulfillmentOutcome> {
  if (session.payment_status !== "paid") return "ignored";
  const pi = paymentIntentId(session);

  const result = await getDb().transaction(async (tx) => {
    const group = await tx
      .select()
      .from(orders)
      .where(eq(orders.stripeCheckoutSessionId, session.id))
      .orderBy(asc(orders.accountId))
      .for("update");
    if (group.length === 0) {
      console.warn(`[stripe] sessão ${session.id} sem pedidos`);
      return null;
    }

    const settled = (o: (typeof group)[number]) =>
      o.status === "PAID" ||
      o.status === "REFUNDED" ||
      (o.status === "FAILED" && o.stripePaymentIntentId !== null);
    if (group.every(settled))
      return { paid: 0, refund: [] as typeof group, full: false, already: true };

    const expected = group.reduce((sum, o) => sum + o.amountCents, 0);
    const amountOk =
      session.amount_total === expected &&
      group.every((o) => o.currency.toUpperCase() === session.currency?.toUpperCase());

    const accountIds = group.map((o) => o.accountId);
    const accountRows = await tx
      .select({ id: accounts.id, status: accounts.status })
      .from(accounts)
      .where(inArray(accounts.id, accountIds))
      .orderBy(asc(accounts.id))
      .for("update");
    const accountStatus = new Map(accountRows.map((a) => [a.id, a.status]));

    const groupIds = group.map((o) => o.id);
    const otherActive = await tx
      .select({ accountId: orders.accountId })
      .from(orders)
      .where(
        and(
          inArray(orders.accountId, accountIds),
          eq(orders.status, "PENDING"),
          notInArray(orders.id, groupIds),
          gt(orders.reservationExpiresAt, new Date()),
        ),
      );
    const takenByOther = new Set(otherActive.map((o) => o.accountId));

    const now = new Date();
    let paid = 0;
    const refund: typeof group = [];
    for (const order of group) {
      if (settled(order)) continue;
      const sellable =
        amountOk &&
        accountStatus.get(order.accountId) !== "SOLD" &&
        !takenByOther.has(order.accountId);
      if (!sellable) {
        await tx
          .update(orders)
          .set({ status: "FAILED", failedAt: now, stripePaymentIntentId: pi })
          .where(eq(orders.id, order.id));
        refund.push(order);
        continue;
      }
      // Checkouts antigos (expirados) desta conta ainda PENDING → cancelados.
      await tx
        .update(orders)
        .set({ status: "CANCELLED", cancelledAt: now })
        .where(
          and(
            eq(orders.accountId, order.accountId),
            eq(orders.status, "PENDING"),
            ne(orders.id, order.id),
          ),
        );
      await tx
        .update(orders)
        .set({ status: "PAID", paidAt: now, stripePaymentIntentId: pi })
        .where(eq(orders.id, order.id));
      await tx
        .update(accounts)
        .set({ status: "SOLD", soldAt: now, reservedUntil: null })
        .where(eq(accounts.id, order.accountId));
      paid += 1;
    }
    if (refund.length) {
      console.error(
        `[stripe] sessão ${session.id}: ${refund.length} conta(s) não entregável(eis) (valorOk=${amountOk}) → reembolso`,
      );
    }
    return { paid, refund, full: !amountOk, already: false };
  });

  if (!result) return "ignored";
  if (result.already) return "already";

  if (result.refund.length && pi) {
    const stripe = getStripe();
    if (result.full) {
      // Valor inesperado: devolve tudo de uma vez.
      try {
        await stripe.refunds.create(
          { payment_intent: pi, reason: "requested_by_customer" },
          { idempotencyKey: `refund-session-${session.id}` },
        );
        await getDb()
          .update(orders)
          .set({ status: "REFUNDED", refundedAt: new Date() })
          .where(
            inArray(
              orders.id,
              result.refund.map((o) => o.id),
            ),
          );
      } catch (error) {
        console.error(`[stripe] FALHA no reembolso total da sessão ${session.id}`, error);
      }
    } else {
      // Só as contas que não puderam ser entregues (reembolso parcial).
      for (const order of result.refund) {
        try {
          await stripe.refunds.create(
            { payment_intent: pi, amount: order.amountCents, reason: "requested_by_customer" },
            { idempotencyKey: `refund-${order.id}` },
          );
          await getDb()
            .update(orders)
            .set({ status: "REFUNDED", refundedAt: new Date() })
            .where(eq(orders.id, order.id));
        } catch (error) {
          // Fica FAILED: o admin vê o botão "Devolver o dinheiro ao cliente".
          console.error(`[stripe] FALHA no reembolso automático do pedido ${order.id}`, error);
        }
      }
    }
  }

  if (result.paid === 0) return "refunded";
  return result.refund.length ? "partial" : "paid";
}

/**
 * Admin: devolve o dinheiro de um pedido pago que não pôde ser entregue (FAILED).
 * Devolve só o valor DESTE pedido (num pagamento de várias contas, as outras continuam pagas).
 */
export async function refundFailedOrder(
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID.test(orderId)) return { ok: false, error: "Pedido não encontrado." };
  const [order] = await getDb()
    .select({ status: orders.status, pi: orders.stripePaymentIntentId, amount: orders.amountCents })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!order) return { ok: false, error: "Pedido não encontrado." };
  if (order.status === "REFUNDED") return { ok: true };
  if (order.status !== "FAILED" || !order.pi) {
    return { ok: false, error: "Este pedido não tem nenhum pagamento por devolver." };
  }
  try {
    await getStripe().refunds.create(
      { payment_intent: order.pi, amount: order.amount, reason: "requested_by_customer" },
      { idempotencyKey: `refund-${orderId}` },
    );
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code !== "charge_already_refunded") {
      console.error(`[stripe] reembolso manual falhou (pedido ${orderId})`, error);
      return {
        ok: false,
        error: "Não foi possível devolver o dinheiro agora. Tente novamente mais tarde.",
      };
    }
  }
  await getDb()
    .update(orders)
    .set({ status: "REFUNDED", refundedAt: new Date() })
    .where(eq(orders.id, orderId));
  return { ok: true };
}

/** Sessão expirada / pagamento assíncrono falhado → liberta as reservas. */
export async function markSessionClosed(
  session: Stripe.Checkout.Session,
  status: "CANCELLED" | "FAILED",
): Promise<void> {
  await getDb().transaction((tx) =>
    releaseOrders(tx, eq(orders.stripeCheckoutSessionId, session.id), status),
  );
}

/** Reembolso TOTAL feito no painel do Stripe → pedidos REFUNDED (as contas continuam SOLD). */
export async function markRefunded(paymentIntent: string): Promise<void> {
  await getDb()
    .update(orders)
    .set({ status: "REFUNDED", refundedAt: new Date() })
    .where(and(eq(orders.stripePaymentIntentId, paymentIntent), eq(orders.status, "PAID")));
}

export type CheckoutStatus = "PENDING" | "PAID" | "PARTIAL" | "REFUNDED" | "FAILED" | "CANCELLED";

export interface CheckoutStatusView {
  groupId: string;
  status: CheckoutStatus;
  totalCents: number;
  items: {
    id: string;
    reference: string;
    status: OrderStatus;
    amountCents: number;
    accountId: string;
    accountTitle: string;
  }[];
}

function summarize(statuses: OrderStatus[]): CheckoutStatus {
  if (statuses.includes("PENDING")) return "PENDING";
  if (statuses.every((s) => s === "PAID")) return "PAID";
  if (statuses.includes("PAID")) return "PARTIAL";
  if (statuses.includes("REFUNDED")) return "REFUNDED";
  if (statuses.includes("FAILED")) return "FAILED";
  return "CANCELLED";
}

/**
 * Estado de um pagamento (grupo de pedidos) do PRÓPRIO utilizador. Se ainda estiver pendente,
 * confirma diretamente com o Stripe (servidor → Stripe): funciona mesmo que o webhook se atrase.
 */
export async function getCheckoutStatus(
  user: SessionUser,
  groupId: string,
): Promise<CheckoutStatusView | null> {
  if (!UUID.test(groupId)) return null;
  const read = () =>
    getDb()
      .select({
        id: orders.id,
        number: orders.number,
        userId: orders.userId,
        status: orders.status,
        amountCents: orders.amountCents,
        accountId: orders.accountId,
        accountTitle: accounts.title,
        sessionId: orders.stripeCheckoutSessionId,
      })
      .from(orders)
      .innerJoin(accounts, eq(orders.accountId, accounts.id))
      .where(eq(orders.checkoutGroupId, groupId))
      .orderBy(asc(orders.number));

  let rows = await read();
  // Ownership: o pagamento de outro utilizador "não existe" para quem pergunta.
  if (rows.length === 0 || rows.some((row) => row.userId !== user.id)) return null;

  const sessionId = rows[0]?.sessionId;
  if (rows.some((row) => row.status === "PENDING") && sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") await markCheckoutPaid(session);
      else if (session.status === "expired") await markSessionClosed(session, "CANCELLED");
      rows = await read();
    } catch (error) {
      console.error("[checkout] falha ao consultar o Stripe", error);
    }
  }

  return {
    groupId,
    status: summarize(rows.map((row) => row.status)),
    totalCents: rows.reduce((sum, row) => sum + row.amountCents, 0),
    items: rows.map((row) => ({
      id: row.id,
      reference: orderReference(row.number),
      status: row.status,
      amountCents: row.amountCents,
      accountId: row.accountId,
      accountTitle: row.accountTitle,
    })),
  };
}

/** O cliente voltou do Stripe sem pagar: expira a sessão e liberta as contas. */
export async function cancelCheckout(
  user: SessionUser,
  groupId: string,
): Promise<CheckoutStatusView | null> {
  if (!UUID.test(groupId)) return null;
  const rows = await getDb()
    .select({
      userId: orders.userId,
      status: orders.status,
      sessionId: orders.stripeCheckoutSessionId,
    })
    .from(orders)
    .where(eq(orders.checkoutGroupId, groupId));
  if (rows.length === 0 || rows.some((row) => row.userId !== user.id)) return null;

  if (rows.some((row) => row.status === "PENDING")) {
    const sessionId = rows[0]?.sessionId;
    if (sessionId) {
      const stripe = getStripe();
      try {
        // Expirar primeiro no Stripe garante que já não pode ser paga depois.
        const session = await stripe.checkout.sessions.expire(sessionId);
        await markSessionClosed(session, "CANCELLED");
      } catch {
        // Não expirou: talvez já tenha sido paga. Confirmar com o Stripe.
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === "paid") await markCheckoutPaid(session);
        else if (session.status === "expired") await markSessionClosed(session, "CANCELLED");
      }
    } else {
      await getDb().transaction((tx) =>
        releaseOrders(tx, eq(orders.checkoutGroupId, groupId), "CANCELLED"),
      );
    }
  }
  return getCheckoutStatus(user, groupId);
}
