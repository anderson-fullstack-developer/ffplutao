import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Search, Users } from "lucide-react";
import { z } from "zod";
import { AdminShell, DataTable } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/misc";
import { listCustomerOrdersFn, listCustomersFn } from "@/functions/admin";
import type { AdminCustomerRow, AdminOrderRow } from "@/lib/admin";
import { centsToEuros } from "@/lib/catalog";
import { formatDate, formatPrice } from "@/lib/format";
import { initialsOf } from "@/lib/session";

export const Route = createFileRoute("/admin/clientes")({
  validateSearch: z.object({ q: z.string().max(80).optional().catch(undefined) }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listCustomersFn({ data: deps }),
  head: () => ({
    meta: [{ title: "Clientes | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminClientes,
});

function AdminClientes() {
  const customers = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = React.useState(search.q ?? "");
  const [selected, setSelected] = React.useState<AdminCustomerRow | null>(null);
  const [orders, setOrders] = React.useState<AdminOrderRow[] | null>(null);

  React.useEffect(() => {
    const value = query.trim();
    if (value === (search.q ?? "")) return;
    const timer = setTimeout(
      () => void navigate({ search: { q: value || undefined }, replace: true }),
      350,
    );
    return () => clearTimeout(timer);
  }, [query, search.q, navigate]);

  const open = async (customer: AdminCustomerRow) => {
    setSelected(customer);
    setOrders(null);
    try {
      setOrders(await listCustomerOrdersFn({ data: { id: customer.id } }));
    } catch {
      setOrders([]);
    }
  };

  return (
    <AdminShell
      title="Clientes"
      description={`${customers.length} ${customers.length === 1 ? "utilizador registado" : "utilizadores registados"}.`}
    >
      <div className="mb-5 max-w-sm">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome ou email..."
            aria-label="Pesquisar clientes"
            className="pl-9"
          />
        </div>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="Nenhum cliente encontrado."
          description="Os clientes aparecem aqui quando criarem conta na loja."
        />
      ) : (
        <DataTable headers={["Cliente", "Email", "Compras", "Total gasto", "Registo", "Tipo"]}>
          {customers.map((customer) => (
            <tr
              key={customer.id}
              onClick={() => void open(customer)}
              className="cursor-pointer transition-colors hover:bg-surface-2/30"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="gold-surface flex size-9 items-center justify-center rounded-full text-xs font-bold">
                    {initialsOf(customer.name)}
                  </span>
                  <span className="font-semibold">{customer.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{customer.email}</td>
              <td className="px-4 py-3">{customer.purchases}</td>
              <td className="px-4 py-3 font-semibold">
                {formatPrice(centsToEuros(customer.totalSpentCents))}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(customer.createdAt)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={customer.role} />
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal
        open={Boolean(selected)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelected(null);
        }}
        title={selected?.name ?? ""}
        description={selected?.email}
        wide
      >
        {selected ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Box label="Compras" value={String(selected.purchases)} />
              <Box
                label="Total gasto"
                value={formatPrice(centsToEuros(selected.totalSpentCents))}
              />
              <Box label="Cliente desde" value={formatDate(selected.createdAt)} />
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold">Pedidos</h4>
              {orders === null ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : orders.length ? (
                <ul className="divide-y divide-border/70 rounded-lg border border-border">
                  {orders.map((order) => (
                    <li
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <span className="font-semibold">{order.reference}</span>
                      <span className="text-muted-foreground">{order.accountTitle}</span>
                      <StatusBadge status={order.status} />
                      <span className="font-semibold">
                        {formatPrice(centsToEuros(order.amountCents))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sem pedidos registados.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-bold">{value}</p>
    </div>
  );
}
