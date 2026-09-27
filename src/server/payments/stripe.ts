import Stripe from "stripe";

import { serverEnv } from "../env";

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (!client) {
    const key = serverEnv().STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
    client = new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
  }
  return client;
}

export type { Stripe };
