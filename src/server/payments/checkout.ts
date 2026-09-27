import { and, asc, eq, gt, inArray, ne } from "drizzle-orm";

import { orderReference, type OrderStatus } from "@/lib/admin";

import type { SessionUser } from "../auth/session";
import { getDb } from "../db/client";
import { accountImages, accounts, orders } from "../db/schema";
import { serverEnv } from "../env";
import { getStripe, type Stripe } from "./stripe";

/**
 * Fluxo de compra (plano.md):
 *  1. startCheckout: reserva a conta (atómico) + cria Order PENDING + sessão Stripe Checkout.
 *  2. O pagamento só é confirmado com dados vindos DO STRIPE (webhook assinado ou
 *     consulta servidor→Stripe com a chave secreta). O redirect /compra/sucesso é só interface.
 *  3. markOrderPaid: Order PAID + conta SOLD numa transação (idempotente).
 *  Pagamento que chegue quando a conta já não pode ser vendida → reembolso automático.
 */

/** O Stripe exige que a sessão expire ≥ 30 min depois de criada. */
const CHECKOUT_TTL_MS = 31 * 60 * 1000;
/** Margem para webhooks de pagamentos concluídos mesmo no fim da sessão. */
const RESERVATION_GRACE_MS = 5 * 60 * 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export type StartCheckoutResult = { ok: true; url: string } | { ok: false; error: string };

class CheckoutError extends Error {}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  return typeof pi === "string" ? pi : (pi?.id ?? null);
}

async function expireSessions(sessionIds: string[]) {
  const stripe = getStripe();
  await Promise.all(
    sessionIds.map(async (id) => {
      try {
        await stripe.checkout.sessions.expire(id);
      } catch {
        // Já expirada ou concluída: nada a fazer.
      }
    }),
  );
}

export async function startCheckout(
  user: SessionUser,
  accountId: string,
): Promise<StartCheckoutResult> {
  if (!UUID.test(accountId)) return { ok: false, error: "Conta indisponível." };
  const db = getDb();
  const now = new Date();
  const checkoutExpiresAt = new Date(now.getTime() + CHECKOUT_TTL_MS);
  const reservedUntil = new Date(checkoutExpiresAt.getTime() + RESERVATION_GRACE_MS);

  let staleSessions: string[] = [];
  let prepared:
    | { kind: "reuse"; sessionId: string }
    | {
        kind: "new";
        orderId: string;
        orderNumber: number;
        title: string;
        amountCents: number;
        currency: string;
        cover: string | null;
      };

  try {
    prepared = await db.transaction(async (tx) => {
      // Bloqueia a conta: dois clientes não podem reservá-la ao mesmo tempo.
      const [account] = await tx
        .select({
          id: accounts.id,
          title: accounts.title,
          priceCents: accounts.priceCents,
          currency: accounts.currency,
          status: accounts.status,
          reservedUntil: accounts.reservedUntil,
        })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .for("update");

      if (!account || account.status === "DRAFT" || account.status === "DISABLED") {
        throw new CheckoutError("Esta conta não está disponível.");
      }
      if (account.status === "SOLD") throw new CheckoutError("Esta conta já foi vendida.");

      const activeReservation =
        account.status === "RESERVED" &&
        account.reservedUntil !== null &&
        account.reservedUntil > now;

      const pendingForAccount = await tx
        .select({
          id: orders.id,
          userId: orders.userId,
          sessionId: orders.stripeCheckoutSessionId,
        })
        .from(orders)
        .where(and(eq(orders.accountId, accountId), eq(orders.status, "PENDING")))
        .for("update");

      if (activeReservation) {
        const mine = pendingForAccount.find((order) => order.userId === user.id);
        if (mine?.sessionId) return { kind: "reuse" as const, sessionId: mine.sessionId };
        throw new CheckoutError(
          "Esta conta está reservada por outro cliente. Tente novamente dentro de alguns minutos.",
        );
      }

      // Reserva expirada (ou conta livre): cancela checkouts antigos desta conta.
      // Um cliente só pode ter UM checkout em curso: cancela os outros dele também.
      const myOtherPending = await tx
        .select({
          id: orders.id,
          accountId: orders.accountId,
          sessionId: orders.stripeCheckoutSessionId,
        })
        .from(orders)
        .where(and(eq(orders.userId, user.id), eq(orders.status, "PENDING")))
        .for("update");

      const toCancel = [...pendingForAccount, ...myOtherPending];
      if (toCancel.length) {
        await tx
          .update(orders)
          .set({ status: "CANCELLED", cancelledAt: now })
          .where(
            inArray(
              orders.id,
              toCancel.map((order) => order.id),
            ),
          );
        staleSessions = toCancel.flatMap((order) => (order.sessionId ? [order.sessionId] : []));
        const released = myOtherPending
          .map((order) => order.accountId)
          .filter((id) => id !== accountId);
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
        .where(eq(accounts.id, accountId));

      const [order] = await tx
        .insert(orders)
        .values({
          userId: user.id,
          accountId,
          amountCents: account.priceCents, // preço SEMPRE da base de dados
          currency: account.currency,
          reservationExpiresAt: reservedUntil,
        })
        .returning({ id: orders.id, number: orders.number });
      if (!order) throw new Error("Falha ao criar pedido");

      const [cover] = await tx
        .select({ url: accountImages.url })
        .from(accountImages)
        .where(eq(accountImages.accountId, accountId))
        .orderBy(asc(accountImages.position))
        .limit(1);

      return {
        kind: "new" as const,
        orderId: order.id,
        orderNumber: order.number,
        title: account.title,
        amountCents: account.priceCents,
        currency: account.currency,
        cover: cover?.url ?? null,
      };
    });
  } catch (error) {
    if (error instanceof CheckoutError) return { ok: false, error: error.message };
    // Conflito de concorrência (deadlock / serialização): o cliente pode simplesmente repetir.
    const code =
      (error as { code?: string; cause?: { code?: string } })?.code ??
      (error as { cause?: { code?: string } })?.cause?.code;
    if (code === "40P01" || code === "40001") {
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
  const metadata = { orderId: prepared.orderId, accountId, userId: user.id };
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        locale: "pt",
        customer_email: user.email,
        client_reference_id: prepared.orderId,
        metadata,
        payment_intent_data: {
          metadata,
          description: `Plutão Shop ${orderReference(prepared.orderNumber)} — ${prepared.title}`,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: prepared.currency.toLowerCase(),
              unit_amount: prepared.amountCents,
              product_data: {
                name: prepared.title,
                description: "Conta digital — dados entregues na sua área de cliente.",
                ...(prepared.cover ? { images: [prepared.cover] } : {}),
              },
            },
          },
        ],
        expires_at: Math.floor(checkoutExpiresAt.getTime() / 1000),
        success_url: `${APP_URL}/compra/sucesso?pedido=${prepared.orderId}`,
        cancel_url: `${APP_URL}/compra/cancelada?pedido=${prepared.orderId}`,
      },
      { idempotencyKey: `checkout-${prepared.orderId}` },
    );

    await db
      .update(orders)
      .set({ stripeCheckoutSessionId: session.id })
      .where(eq(orders.id, prepared.orderId));

    if (!session.url) throw new Error("Sessão Stripe sem URL");
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[checkout] falha ao criar sessão Stripe", error);
    await releaseOrder(prepared.orderId, "FAILED");
    return { ok: false, error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
}

/** Fecha um pedido PENDING (cancelado/expirado/falhado) e liberta a conta se ninguém a tiver. */
async function releaseOrder(orderId: string, status: "CANCELLED" | "FAILED", tx?: Tx) {
  const run = async (t: Tx) => {
    const [order] = await t
      .select({ id: orders.id, accountId: orders.accountId, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");
    if (!order || order.status !== "PENDING") return;

    const now = new Date();
    await t
      .update(orders)
      .set(status === "CANCELLED" ? { status, cancelledAt: now } : { status, failedAt: now })
      .where(eq(orders.id, orderId));

    const [otherActive] = await t
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.accountId, order.accountId),
          eq(orders.status, "PENDING"),
          ne(orders.id, orderId),
          gt(orders.reservationExpiresAt, now),
        ),
      )
      .limit(1);
    if (!otherActive) {
      await t
        .update(accounts)
        .set({ status: "AVAILABLE", reservedUntil: null })
        .where(and(eq(accounts.id, order.accountId), eq(accounts.status, "RESERVED")));
    }
  };
  if (tx) return run(tx);
  return getDb().transaction(run);
}

export type FulfillmentOutcome = "paid" | "already" | "refunded" | "ignored";

/**
 * Confirma o pagamento a partir de uma sessão VINDA DO STRIPE (webhook verificado ou
 * consulta com a chave secreta). Idempotente: pode ser chamada várias vezes.
 */
export async function markOrderPaid(session: Stripe.Checkout.Session): Promise<FulfillmentOutcome> {
  if (session.payment_status !== "paid") return "ignored";
  const orderId = session.metadata?.["orderId"] ?? session.client_reference_id;
  if (!orderId || !UUID.test(orderId)) return "ignored";
  const pi = paymentIntentId(session);

  const outcome = await getDb().transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order || order.stripeCheckoutSessionId !== session.id) {
      console.warn(`[stripe] sessão ${session.id} não corresponde ao pedido ${orderId}`);
      return "ignored" as const;
    }
    if (order.status === "PAID" || order.status === "REFUNDED") return "already" as const;
    if (order.status === "FAILED" && order.stripePaymentIntentId) return "already" as const;

    const [account] = await tx
      .select({ status: accounts.status })
      .from(accounts)
      .where(eq(accounts.id, order.accountId))
      .for("update");

    const [otherActive] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.accountId, order.accountId),
          eq(orders.status, "PENDING"),
          ne(orders.id, order.id),
          gt(orders.reservationExpiresAt, new Date()),
        ),
      )
      .limit(1);

    const amountOk =
      session.amount_total === order.amountCents &&
      session.currency?.toUpperCase() === order.currency.toUpperCase();
    const sellable = account && account.status !== "SOLD" && !otherActive;

    if (!amountOk || !sellable) {
      // Pago, mas não pode ser entregue (reserva perdida / valor inesperado) → reembolso.
      await tx
        .update(orders)
        .set({ status: "FAILED", failedAt: new Date(), stripePaymentIntentId: pi })
        .where(eq(orders.id, order.id));
      console.error(
        `[stripe] pedido ${order.id} pago mas não vendável (valorOk=${amountOk}) → reembolso`,
      );
      return "refund" as const;
    }

    const now = new Date();
    // Cancela checkouts antigos (expirados) que ainda estejam PENDING nesta conta.
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
    return "paid" as const;
  });

  if (outcome !== "refund") return outcome;

  if (pi) {
    try {
      await getStripe().refunds.create(
        { payment_intent: pi, reason: "requested_by_customer" },
        { idempotencyKey: `refund-${orderId}` },
      );
      await getDb()
        .update(orders)
        .set({ status: "REFUNDED", refundedAt: new Date() })
        .where(eq(orders.id, orderId));
    } catch (error) {
      // Fica FAILED com o payment intent: o admin vê e reembolsa manualmente no Stripe.
      console.error(`[stripe] FALHA no reembolso automático do pedido ${orderId}`, error);
    }
  }
  return "refunded";
}

/** Sessão expirada / pagamento assíncrono falhado → liberta a reserva. */
export async function markSessionClosed(
  session: Stripe.Checkout.Session,
  status: "CANCELLED" | "FAILED",
): Promise<void> {
  const orderId = session.metadata?.["orderId"] ?? session.client_reference_id;
  if (!orderId || !UUID.test(orderId)) return;
  await getDb().transaction(async (tx) => {
    const [order] = await tx
      .select({ sessionId: orders.stripeCheckoutSessionId })
      .from(orders)
      .where(eq(orders.id, orderId));
    if (order?.sessionId !== session.id) return;
    await releaseOrder(orderId, status, tx);
  });
}

/** Reembolso feito no painel do Stripe → pedido REFUNDED (a conta continua SOLD). */
export async function markRefunded(paymentIntent: string): Promise<void> {
  await getDb()
    .update(orders)
    .set({ status: "REFUNDED", refundedAt: new Date() })
    .where(and(eq(orders.stripePaymentIntentId, paymentIntent), eq(orders.status, "PAID")));
}

export interface OrderStatusView {
  id: string;
  reference: string;
  status: OrderStatus;
  amountCents: number;
  accountId: string;
  accountTitle: string;
}

/**
 * Estado de um pedido do PRÓPRIO utilizador. Se ainda estiver PENDING, confirma diretamente
 * com o Stripe (servidor → Stripe): funciona mesmo que o webhook se atrase.
 */
export async function getOrderStatus(
  user: SessionUser,
  orderId: string,
): Promise<OrderStatusView | null> {
  if (!UUID.test(orderId)) return null;
  const read = async () => {
    const [row] = await getDb()
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
      .where(eq(orders.id, orderId));
    // Ownership: o pedido de outro utilizador "não existe" para quem pergunta.
    return row && row.userId === user.id ? row : null;
  };

  let row = await read();
  if (!row) return null;

  if (row.status === "PENDING" && row.sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(row.sessionId);
      if (session.payment_status === "paid") await markOrderPaid(session);
      else if (session.status === "expired") await markSessionClosed(session, "CANCELLED");
      row = (await read()) ?? row;
    } catch (error) {
      console.error("[checkout] falha ao consultar o Stripe", error);
    }
  }

  return {
    id: row.id,
    reference: orderReference(row.number),
    status: row.status,
    amountCents: row.amountCents,
    accountId: row.accountId,
    accountTitle: row.accountTitle,
  };
}

/** O cliente voltou do Stripe sem pagar: expira a sessão e liberta a conta. */
export async function cancelCheckout(
  user: SessionUser,
  orderId: string,
): Promise<OrderStatusView | null> {
  if (!UUID.test(orderId)) return null;
  const [order] = await getDb()
    .select({
      userId: orders.userId,
      status: orders.status,
      sessionId: orders.stripeCheckoutSessionId,
    })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!order || order.userId !== user.id) return null;

  if (order.status === "PENDING") {
    if (order.sessionId) {
      const stripe = getStripe();
      try {
        // Expirar primeiro no Stripe garante que já não pode ser paga depois.
        const session = await stripe.checkout.sessions.expire(order.sessionId);
        await markSessionClosed(session, "CANCELLED");
      } catch {
        // Não expirou: talvez já tenha sido paga. Confirmar com o Stripe.
        const session = await stripe.checkout.sessions.retrieve(order.sessionId);
        if (session.payment_status === "paid") await markOrderPaid(session);
        else if (session.status === "expired") await markSessionClosed(session, "CANCELLED");
      }
    } else {
      await releaseOrder(orderId, "CANCELLED");
    }
  }
  return getOrderStatus(user, orderId);
}
