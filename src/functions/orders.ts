import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/server/auth/guards";
import { getMyDashboard, getMyOrder, listMyOrders } from "@/server/orders/customer";

// Área de cliente. As credenciais NÃO passam por aqui: só pela rota
// /api/orders/{id}/credentials, pedida quando o cliente carrega em "Revelar dados".

export const listMyOrdersFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return listMyOrders(user);
});

export const getMyOrderFn = createServerFn({ method: "GET" })
  .validator((data: { orderId: string }) => z.object({ orderId: z.string().max(64) }).parse(data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return getMyOrder(user, data.orderId);
  });

export const getMyDashboardFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return getMyDashboard(user);
});
