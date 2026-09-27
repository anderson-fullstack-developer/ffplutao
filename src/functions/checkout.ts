import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/server/auth/guards";
import {
  cancelCheckout,
  getCheckoutStatus,
  MAX_CART_ITEMS,
  startCheckout,
} from "@/server/payments/checkout";

const accountIdsSchema = z.object({
  accountIds: z.array(z.string().uuid()).min(1).max(MAX_CART_ITEMS),
  acceptTerms: z.boolean(),
});
const groupIdSchema = z.object({ groupId: z.string().uuid() });

/**
 * Reserva as contas (1 = "Comprar agora"; várias = carrinho) e devolve o URL da página de
 * pagamento. Os preços vêm sempre da base de dados.
 */
export const startCheckoutFn = createServerFn({ method: "POST" })
  .validator((data: { accountIds: string[]; acceptTerms: boolean }) => accountIdsSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return startCheckout(user, data.accountIds, { acceptedTerms: data.acceptTerms });
  });

/** Estado de um pagamento do próprio utilizador (confirma com o Stripe se ainda pendente). */
export const getCheckoutStatusFn = createServerFn({ method: "GET" })
  .validator((data: { groupId: string }) => groupIdSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return getCheckoutStatus(user, data.groupId);
  });

export const cancelCheckoutFn = createServerFn({ method: "POST" })
  .validator((data: { groupId: string }) => groupIdSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return cancelCheckout(user, data.groupId);
  });
