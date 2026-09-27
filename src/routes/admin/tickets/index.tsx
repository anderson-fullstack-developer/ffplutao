import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Inbox, Search } from "lucide-react";
import { z } from "zod";
import { AdminShell, DataTable } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { listTicketsAdminFn } from "@/functions/support";
import { cn, formatDateTime } from "@/lib/format";

const tabs = [
  { value: "responder", label: "Por responder" },
  { value: "OPEN", label: "Abertos" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "CLOSED", label: "Fechados" },
  { value: "todos", label: "Todos" },
] as const;

export const Route = createFileRoute("/admin/tickets/")({
  validateSearch: z.object({
    vista: z
      .enum(["responder", "OPEN", "IN_PROGRESS", "CLOSED", "todos"])
      .optional()
      .catch(undefined),
    q: z.string().max(80).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => {
    const vista = deps.vista ?? "responder";
    return listTicketsAdminFn({
      data: {
        q: deps.q,
        awaiting: vista === "responder" ? true : undefined,
        status:
          vista === "OPEN" || vista === "IN_PROGRESS" || vista === "CLOSED" ? vista : undefined,
      },
    });
  },
  head: () => ({
    meta: [{ title: "Tickets | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminTickets,
});

function AdminTickets() {
  const tickets = Route.useLoaderData();
  const search = Route.useSearch();
  const routeNavigate = Route.useNavigate();
  const navigate = useNavigate();
  const vista = search.vista ?? "responder";
  const [query, setQuery] = React.useState(search.q ?? "");

  React.useEffect(() => {
    const value = query.trim();
    if (value === (search.q ?? "")) return;
    const timer = setTimeout(
      () =>
        void routeNavigate({
          search: (prev) => ({ ...prev, q: value || undefined }),
          replace: true,
        }),
      350,
    );
    return () => clearTimeout(timer);
  }, [query, search.q, routeNavigate]);

  const open = (id: string) => void navigate({ to: "/admin/tickets/$id", params: { id } });

  return (
    <AdminShell
      title="Tickets de suporte"
      description="Mensagens dos clientes. Responda aos que estão à espera."
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nº do ticket, cliente, email ou assunto..."
            aria-label="Pesquisar tickets"
            className="pl-9"
          />
        </div>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() =>
                void routeNavigate({
                  search: (prev) => ({
                    ...prev,
                    vista: tab.value === "responder" ? undefined : tab.value,
                  }),
                })
              }
              className={cn(
                "cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                vista === tab.value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" />}
          title={vista === "responder" ? "Nada por responder. 🎉" : "Nenhum ticket encontrado."}
          description={
            vista === "responder"
              ? "Quando um cliente escrever, o ticket aparece aqui."
              : "Experimente outro separador ou pesquisa."
          }
        />
      ) : (
        <DataTable
          headers={[
            "Ticket",
            "Assunto",
            "Cliente",
            "Pedido",
            "Mensagens",
            "Estado",
            "Última mensagem",
          ]}
        >
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              tabIndex={0}
              onClick={() => open(ticket.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") open(ticket.id);
              }}
              className="cursor-pointer transition-colors outline-none hover:bg-surface-2/30 focus-visible:bg-surface-2/40"
            >
              <td className="px-4 py-3 font-semibold">
                <span className="inline-flex items-center gap-2">
                  {ticket.awaitingAdmin && ticket.status !== "CLOSED" ? (
                    <span className="size-2 rounded-full bg-primary" title="À espera de resposta" />
                  ) : null}
                  {ticket.reference}
                </span>
              </td>
              <td className="px-4 py-3">{ticket.subject}</td>
              <td className="px-4 py-3">
                <p>{ticket.customerName}</p>
                <p className="text-xs text-muted-foreground">{ticket.customerEmail}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{ticket.orderReference ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{ticket.messagesCount}</td>
              <td className="px-4 py-3">
                <StatusBadge status={ticket.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDateTime(ticket.lastMessageAt)}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </AdminShell>
  );
}
