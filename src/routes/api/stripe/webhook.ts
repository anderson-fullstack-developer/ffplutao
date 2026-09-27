import { createFileRoute } from "@tanstack/react-router";

import { handleStripeWebhook } from "@/server/payments/webhook";

/** Endpoint do webhook: configurar no Stripe como https://<domínio>/api/stripe/webhook */
export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => handleStripeWebhook(request),
    },
  },
});
