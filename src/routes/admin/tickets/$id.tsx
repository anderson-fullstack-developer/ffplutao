import * as React from "react";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { TicketThread } from "@/components/support/ticket-thread";
import { Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { getTicketAdminFn, replyAsAdminFn, setTicketStatusFn } from "@/functions/support";
import { centsToEuros } from "@/lib/catalog";
import { formatDate, formatPrice } from "@/lib/format";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/support";

export const Route = createFileRoute("/admin/tickets/$id")({
  loader: async ({ params }) => {
    const ticket = await getTicketAdminFn({ data: { ticketId: params.id } });
    if (!ticket) throw notFound();
    return ticket;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Ticket ${loaderData?.reference ?? ""} | Plutão Shop` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminTicket,
});

function AdminTicket() {
  const ticket = Route.useLoaderData();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [closeAfter, setCloseAfter] = React.useState(false);

  const refresh = async () => {
    await router.invalidate();
    await queryClient.invalidateQueries({ queryKey: ["admin-tickets-awaiting"] });
  };

  const changeStatus = async (status: TicketStatus) => {
    try {
      const result = await setTicketStatusFn({ data: { ticketId: ticket.id, status } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Estado atualizado");
      await refresh();
    } catch {
      toast.error("Não foi possível alterar o estado.");
    }
  };

  return (
    <AdminShell title={ticket.subject} description={`Ticket ${ticket.reference}`}>
      <Link
        to="/admin/tickets"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Todos os tickets
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="surface-panel p-5 sm:p-6">
          <TicketThread
            viewer="admin"
            messages={ticket.messages}
            placeholder="Escreva a resposta ao cliente..."
            sendLabel={closeAfter ? "Responder e fechar" : "Responder"}
            extraActions={
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={closeAfter}
                  onChange={(e) => setCloseAfter(e.target.checked)}
                  className="size-4 accent-[oklch(0.82_0.165_78)]"
                />
                Fechar o ticket depois de responder
              </label>
            }
            onSend={async (message) => {
              const result = await replyAsAdminFn({
                data: { ticketId: ticket.id, message, status: closeAfter ? "CLOSED" : undefined },
              });
              if (result.ok) {
                toast.success(
                  closeAfter ? "Resposta enviada e ticket fechado" : "Resposta enviada",
                );
                setCloseAfter(false);
                await refresh();
              }
              return result;
            }}
          />
        </section>

        <aside className="space-y-4">
          <div className="surface-panel space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Estado</span>
              <StatusBadge status={ticket.status} />
            </div>
            <Select
              value={ticket.status}
              onChange={(e) => void changeStatus(e.target.value as TicketStatus)}
              aria-label="Alterar estado"
            >
              {TICKET_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
            {ticket.awaitingAdmin && ticket.status !== "CLOSED" ? (
              <p className="text-xs text-primary">O cliente está à espera de resposta.</p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5" /> Sem mensagens por responder.
              </p>
            )}
          </div>

          <div className="surface-panel space-y-1 p-5 text-sm">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Cliente
            </p>
            <p className="font-semibold">{ticket.customerName}</p>
            <p className="break-all text-muted-foreground">{ticket.customerEmail}</p>
            <Link
              to="/admin/clientes"
              search={{ q: ticket.customerEmail }}
              className="inline-block pt-1 text-xs text-primary hover:underline"
            >
              Ver cliente e compras
            </Link>
          </div>

          <div className="surface-panel space-y-1 p-5 text-sm">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Pedido relacionado
            </p>
            {ticket.order ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{ticket.order.reference}</p>
                  <StatusBadge status={ticket.order.status} />
                </div>
                <p className="text-muted-foreground">{ticket.order.accountTitle}</p>
                <p>
                  {formatPrice(centsToEuros(ticket.order.amountCents))} ·{" "}
                  {formatDate(ticket.order.createdAt)}
                </p>
                <div className="flex flex-wrap gap-3 pt-1 text-xs">
                  <Link
                    to="/admin/pedidos"
                    search={{ q: ticket.order.reference }}
                    className="text-primary hover:underline"
                  >
                    Ver pedido
                  </Link>
                  <Link
                    to="/admin/contas/$id/editar"
                    params={{ id: ticket.order.accountId }}
                    className="text-primary hover:underline"
                  >
                    Ver conta (e credenciais)
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Nenhum.</p>
            )}
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
