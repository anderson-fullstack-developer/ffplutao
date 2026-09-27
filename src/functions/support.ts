import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { CreateTicketInput, TicketStatus } from "@/lib/support";
import { requireAdmin, requireUser } from "@/server/auth/guards";
import {
  countAwaitingTickets,
  createTicket,
  getMyTicket,
  getTicketAdmin,
  listMyTickets,
  listSupportOrderOptions,
  listTicketsAdmin,
  replyAsAdmin,
  replyAsCustomer,
  setTicketStatus,
} from "@/server/support/tickets";

const ticketStatuses = ["OPEN", "IN_PROGRESS", "CLOSED"] as const;
const ticketIdSchema = z.object({ ticketId: z.string().uuid() });

// ------------------------------------------------------------ cliente

export const listSupportOrderOptionsFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return listSupportOrderOptions(user);
});

export const createTicketFn = createServerFn({ method: "POST" })
  .validator((data: CreateTicketInput) => data)
  .handler(async ({ data }) => {
    const user = await requireUser();
    return createTicket(user, data);
  });

export const listMyTicketsFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  return listMyTickets(user);
});

export const getMyTicketFn = createServerFn({ method: "GET" })
  .validator((data: { ticketId: string }) => ticketIdSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return getMyTicket(user, data.ticketId);
  });

export const replyToTicketFn = createServerFn({ method: "POST" })
  .validator((data: { ticketId: string; message: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireUser();
    return replyAsCustomer(user, data);
  });

// ------------------------------------------------------------ admin

export const listTicketsAdminFn = createServerFn({ method: "GET" })
  .validator(
    (data: {
      status?: TicketStatus | undefined;
      awaiting?: boolean | undefined;
      q?: string | undefined;
    }) =>
      z
        .object({
          status: z.enum(ticketStatuses).optional(),
          awaiting: z.boolean().optional(),
          q: z.string().trim().max(80).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    return listTicketsAdmin(data);
  });

export const getTicketAdminFn = createServerFn({ method: "GET" })
  .validator((data: { ticketId: string }) => ticketIdSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdmin();
    return getTicketAdmin(data.ticketId);
  });

export const replyAsAdminFn = createServerFn({ method: "POST" })
  .validator(
    (data: { ticketId: string; message: string; status?: TicketStatus | undefined }) => data,
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    const status = z.enum(ticketStatuses).optional().parse(data.status);
    return replyAsAdmin(admin, { ticketId: data.ticketId, message: data.message }, status);
  });

export const setTicketStatusFn = createServerFn({ method: "POST" })
  .validator((data: { ticketId: string; status: TicketStatus }) =>
    z.object({ ticketId: z.string().uuid(), status: z.enum(ticketStatuses) }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    return setTicketStatus(data.ticketId, data.status);
  });

export const countAwaitingTicketsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return countAwaitingTickets();
});
