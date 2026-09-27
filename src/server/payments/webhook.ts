import { eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { stripeEvents } from "../db/schema";
import { serverEnv } from "../env";
import { markOrderPaid, markRefunded, markSessionClosed } from "./checkout";
import { getStripe, type Stripe } from "./stripe";

/**
 * Webhook do Stripe:
 *  1. valida a assinatura (sem assinatura válida → 400, nada é processado);
 *  2. idempotência: cada evento é registado em stripe_events (PK = id do evento);
 *  3. processa; se falhar, apaga o registo e devolve 500 para o Stripe tentar de novo.
 */
export async function handleStripeWebhook(request: Request): Promise<Response> {
  const secret = serverEnv().STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return json(400, { error: "assinatura em falta" });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch {
    return json(400, { error: "assinatura inválida" });
  }

  const db = getDb();
  const inserted = await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.id });
  if (inserted.length === 0) return json(200, { received: true, duplicate: true });

  try {
    await processEvent(event);
  } catch (error) {
    console.error(`[stripe] erro a processar ${event.type} ${event.id}`, error);
    await db.delete(stripeEvents).where(eq(stripeEvents.id, event.id));
    return json(500, { error: "falha ao processar" });
  }
  return json(200, { received: true });
}

async function processEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await markOrderPaid(event.data.object);
      break;
    case "checkout.session.async_payment_failed":
      await markSessionClosed(event.data.object, "FAILED");
      break;
    case "checkout.session.expired":
      await markSessionClosed(event.data.object, "CANCELLED");
      break;
    case "charge.refunded": {
      const pi = event.data.object.payment_intent;
      const id = typeof pi === "string" ? pi : pi?.id;
      if (id && event.data.object.refunded) await markRefunded(id);
      break;
    }
    default:
      break;
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
