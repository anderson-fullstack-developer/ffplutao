import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, DataTable } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/confirm-modal";
import { customers } from "@/mock/users";
import { orders } from "@/mock/orders";
import { formatDate, formatPrice } from "@/lib/format";
import type { User } from "@/types";

export const Route = createFileRoute("/admin/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes | Plutão Shop" },
      { name: "description", content: "Lista de clientes registados na Plutão Shop." },
      { property: "og:title", content: "Clientes | Plutão Shop" },
      { property: "og:description", content: "Gestão de clientes da loja." },
    ],
  }),
  component: AdminClientes,
});

function AdminClientes() {
  const [selected, setSelected] = React.useState<User | null>(null);
  const selectedOrders = selected
    ? orders.filter((order) => order.customerEmail === selected.email)
    : [];

  return (
    <AdminShell title="Clientes" description={`${customers.length} clientes registados.`}>
      <DataTable
        headers={["Cliente", "Email", "Compras", "Total gasto", "Data de registro", "Status"]}
      >
        {customers.map((customer) => (
          <tr
            key={customer.id}
            onClick={() => setSelected(customer)}
            className="cursor-pointer transition-colors hover:bg-surface-2/30"
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="gold-surface flex size-9 items-center justify-center rounded-full text-xs font-bold">
                  {customer.avatarInitials}
                </span>
                <span className="font-semibold">{customer.name}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-muted-foreground">{customer.email}</td>
            <td className="px-4 py-3">{customer.purchases}</td>
            <td className="px-4 py-3 font-semibold">{formatPrice(customer.totalSpent)}</td>
            <td className="px-4 py-3 text-muted-foreground">{formatDate(customer.createdAt)}</td>
            <td className="px-4 py-3">
              <StatusBadge status={customer.status} />
            </td>
          </tr>
        ))}
      </DataTable>

      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.name ?? ""}
        description={selected?.email}
        wide
      >
        {selected ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Box label="Compras" value={String(selected.purchases)} />
              <Box label="Total gasto" value={formatPrice(selected.totalSpent)} />
              <Box label="Cliente desde" value={formatDate(selected.createdAt)} />
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold">Pedidos recentes</h4>
              {selectedOrders.length ? (
                <ul className="divide-y divide-border/70 rounded-lg border border-border">
                  {selectedOrders.map((order) => (
                    <li
                      key={order.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <span className="font-semibold">{order.reference}</span>
                      <span className="text-muted-foreground">{order.accountTitle}</span>
                      <StatusBadge status={order.status} />
                      <span className="font-semibold">{formatPrice(order.amount)}</span>
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
