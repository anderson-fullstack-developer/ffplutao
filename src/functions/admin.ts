import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AccountInput, AccountStatus, OrderStatus } from "@/lib/admin";
import {
  createAccount,
  deleteAccount,
  getAdminAccount,
  listAdminAccounts,
  revealAccountCredentials,
  updateAccount,
} from "@/server/admin/accounts";
import { createUploadSignature } from "@/server/admin/cloudinary";
import {
  getDashboard,
  listAdminOrders,
  listCustomerOrders,
  listCustomers,
} from "@/server/admin/reports";
import { requireAdmin } from "@/server/auth/guards";
import { refundFailedOrder } from "@/server/payments/checkout";

// TODAS as funções começam por requireAdmin(): a proteção da rota /admin é só interface.

const idSchema = z.object({ id: z.string().max(64) });
const accountStatuses = ["DRAFT", "AVAILABLE", "RESERVED", "SOLD", "DISABLED"] as const;
const orderStatuses = ["PENDING", "PAID", "CANCELLED", "FAILED", "REFUNDED"] as const;

export const getAdminDashboardFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return getDashboard();
});

export const listAdminAccountsFn = createServerFn({ method: "GET" })
  .validator((data: { q?: string | undefined; status?: AccountStatus | undefined }) =>
    z
      .object({
        q: z.string().trim().max(80).optional(),
        status: z.enum(accountStatuses).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    return listAdminAccounts(data);
  });

export const getAdminAccountFn = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => idSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdmin();
    return getAdminAccount(data.id);
  });

export const createAccountFn = createServerFn({ method: "POST" })
  .validator((data: AccountInput) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    return createAccount(data);
  });

export const updateAccountFn = createServerFn({ method: "POST" })
  .validator((data: { id: string; input: AccountInput }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    return updateAccount(String(data.id), data.input);
  });

export const deleteAccountFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => idSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdmin();
    return deleteAccount(data.id);
  });

export const revealAccountCredentialsFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    console.info(`[admin] ${admin.email} viu as credenciais da conta ${data.id}`);
    return revealAccountCredentials(data.id);
  });

export const getUploadSignatureFn = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdmin();
  return createUploadSignature();
});

export const listAdminOrdersFn = createServerFn({ method: "GET" })
  .validator((data: { q?: string | undefined; status?: OrderStatus | undefined }) =>
    z
      .object({ q: z.string().trim().max(80).optional(), status: z.enum(orderStatuses).optional() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    return listAdminOrders(data);
  });

export const listCustomersFn = createServerFn({ method: "GET" })
  .validator((data: { q?: string | undefined }) =>
    z.object({ q: z.string().trim().max(80).optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    return listCustomers(data.q);
  });

export const listCustomerOrdersFn = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    await requireAdmin();
    return listCustomerOrders(data.id);
  });

/** Devolve o dinheiro de um pedido pago que não pôde ser entregue. */
export const refundOrderFn = createServerFn({ method: "POST" })
  .validator((data: { orderId: string }) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    console.info(`[admin] ${admin.email} pediu reembolso do pedido ${data.orderId}`);
    return refundFailedOrder(data.orderId);
  });
