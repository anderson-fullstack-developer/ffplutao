import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { TicketThread } from "@/components/support/ticket-thread";
import { StatusBadge } from "@/components/ui/status-badge";
import { getMyTicketFn, replyToTicketFn } from "@/functions/support";
import { centsToEuros } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/dashboard/suporte/$id")({
  loader: async ({ params }) => {
    const ticket = await getMyTicketFn({ data: { ticketId: params.id } });
    if (!ticket) throw notFound();
    return ticket;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.subject ?? "Suporte"} | Plutão Shop` }],
  }),
  component: Ticket,
});

function Ticket() {
  const ticket = Route.useLoaderData();
  const router = useRouter();

  return (
    <DashboardShell title={ticket.subject} description={`Ticket ${ticket.reference}`}>
      <Link
        to="/dashboard/suporte"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Todos os tickets
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="surface-panel p-5 sm:p-6">
          <TicketThread
            viewer="customer"
            messages={ticket.messages}
            closedNotice={
              ticket.status === "CLOSED"
                ? "Este ticket foi fechado. Se responder, ele volta a ser aberto."
                : undefined
            }
            onSend={async (message) => {
              const result = await replyToTicketFn({ data: { ticketId: ticket.id, message } });
              if (result.ok) await router.invalidate();
              return result;
            }}
          />
        </section>

        <aside className="surface-panel h-fit space-y-3 p-5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estado</span>
            <StatusBadge status={ticket.status} />
          </div>
          {ticket.order ? (
            <div className="border-t border-border pt-3">
              <p className="text-muted-foreground">Pedido relacionado</p>
              <p className="mt-1 font-semibold">{ticket.order.reference}</p>
              <p className="text-xs text-muted-foreground">{ticket.order.accountTitle}</p>
              <p className="mt-1 text-xs">{formatPrice(centsToEuros(ticket.order.amountCents))}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </DashboardShell>
  );
}
