import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquarePlus, MessagesSquare } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { listMyTicketsFn } from "@/functions/support";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/dashboard/suporte/")({
  loader: () => listMyTicketsFn(),
  head: () => ({ meta: [{ title: "Suporte | Plutão Shop" }] }),
  component: MeusTickets,
});

function MeusTickets() {
  const tickets = Route.useLoaderData();

  return (
    <DashboardShell title="Suporte" description="As suas conversas com a equipa da Plutão Shop.">
      <div className="mb-5 flex justify-end">
        <Button asChild>
          <Link to="/suporte">
            <MessageSquarePlus className="size-4" /> Nova mensagem
          </Link>
        </Button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare className="size-6" />}
          title="Ainda não tem mensagens."
          description="Se precisar de ajuda com uma compra ou com a sua conta, fale connosco."
        />
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => {
            const answered = !ticket.awaitingAdmin && ticket.status !== "CLOSED";
            return (
              <li key={ticket.id}>
                <Link
                  to="/dashboard/suporte/$id"
                  params={{ id: ticket.id }}
                  className="surface-panel flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-primary/40"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {ticket.subject}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {ticket.reference}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ticket.orderReference ? `Pedido ${ticket.orderReference} · ` : ""}
                      Última mensagem {formatDateTime(ticket.lastMessageAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {answered ? (
                      <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                        Nova resposta
                      </span>
                    ) : null}
                    <StatusBadge status={ticket.status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
