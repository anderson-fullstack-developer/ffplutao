import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { AdminShell, DataTable } from "@/components/admin/admin-shell";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/confirm-modal";
import { orders } from "@/mock/orders";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order } from "@/types";

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos | Plutão Shop" },
      { name: "description", content: "Acompanhe todos os pedidos da loja Plutão Shop." },
      { property: "og:title", content: "Pedidos | Plutão Shop" },
      { property: "og:description", content: "Gestão de pedidos e pagamentos." },
    ],
  }),
  component: AdminPedidos,
});

function AdminPedidos() {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("todos");
  const [selected, setSelected] = React.useState<Order | null>(null);

  const rows = orders.filter(
    (order) =>
      (status === "todos" || order.status === status) &&
      (order.reference.toLowerCase().includes(query.toLowerCase()) ||
        order.customerName.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <AdminShell title="Pedidos" description={`${rows.length} pedidos encontrados.`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar pedidos..."
            aria-label="Pesquisar pedidos"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrar por status"
          className="sm:w-52"
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
          <option value="reembolsado">Reembolsado</option>
        </Select>
      </div>

      <DataTable
        headers={["Pedido", "Cliente", "Produto", "Valor", "Pagamento", "Status", "Data", "Ações"]}
      >
        {rows.map((order) => (
          <tr key={order.id} className="transition-colors hover:bg-surface-2/30">
            <td className="px-4 py-3 font-semibold">{order.reference}</td>
            <td className="px-4 py-3 text-muted-foreground">{order.customerName}</td>
            <td className="px-4 py-3">{order.accountTitle}</td>
            <td className="px-4 py-3 font-semibold">{formatPrice(order.amount)}</td>
            <td className="px-4 py-3 text-muted-foreground">{order.paymentMethod}</td>
            <td className="px-4 py-3">
              <StatusBadge status={order.status} />
            </td>
            <td className="px-4 py-3 text-muted-foreground">{formatDate(order.date)}</td>
            <td className="px-4 py-3">
              <Button size="sm" variant="outline" onClick={() => setSelected(order)}>
                Ver
              </Button>
            </td>
          </tr>
        ))}
      </DataTable>

      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected ? `Pedido ${selected.reference}` : ""}
        description={selected ? `${selected.customerName} · ${selected.customerEmail}` : undefined}
      >
        {selected ? (
          <dl className="space-y-2 text-sm">
            <Row label="Produto" value={selected.accountTitle} />
            <Row label="Valor" value={formatPrice(selected.amount)} />
            <Row label="Pagamento" value={selected.paymentMethod} />
            <Row label="Data" value={formatDate(selected.date)} />
          </dl>
        ) : null}
      </Modal>
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/70 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
