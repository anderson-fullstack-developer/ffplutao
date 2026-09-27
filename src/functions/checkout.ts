import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/server/auth/guards";
import { cancelCheckout, getOrderStatus, startCheckout } from "@/server/payments/checkout";

const accountIdSchema = z.object({ accountId: z.string().uuid() });
const orderIdSchema = z.object({ orderId: z.string().uuid() });

/** Reserva a conta e devolve o URL do Stripe Checkout. O preço vem sempre da base de dados. */
export const startCheckoutFn = createServerFn({ method: "POST" })
  .validator((data: { accountId: string }) => accountIdSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return startCheckout(user, data.accountId);
  });

/** Estado de um pedido do próprio utilizador (confirma com o Stripe se ainda estiver pendente). */
export const getOrderStatusFn = createServerFn({ method: "GET" })
  .validator((data: { orderId: string }) => orderIdSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return getOrderStatus(user, data.orderId);
  });

export const cancelCheckoutFn = createServerFn({ method: "POST" })
  .validator((data: { orderId: string }) => orderIdSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return cancelCheckout(user, data.orderId);
  });
