import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, DataTable } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminStats, salesChart } from "@/mock/admin";
import { orders } from "@/mock/orders";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Painel admin | Plutão Shop" },
      { name: "description", content: "Métricas de vendas, pedidos e clientes da Plutão Shop." },
      { property: "og:title", content: "Painel admin | Plutão Shop" },
      { property: "og:description", content: "Gestão da loja Plutão Shop." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const max = Math.max(...salesChart.map((d) => d.value));

  return (
    <AdminShell title="Dashboard" description="Visão geral da operação da loja.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {adminStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
        ))}
      </div>

      <section className="surface-panel mt-8 p-6">
        <h2 className="font-bold">Vendas nos últimos 30 dias</h2>
        <div className="mt-6 flex h-52 items-end gap-2">
          {salesChart.map((point) => (
            <div key={point.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div
                className="gold-surface w-full rounded-t-md transition-all hover:brightness-110"
                style={{ height: `${Math.max((point.value / max) * 92, 4)}%` }}
                title={`Dia ${point.day}: €${point.value}`}
              />
              <span className="text-[10px] text-muted-foreground">{point.day}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-bold">Pedidos recentes</h2>
        <DataTable headers={["Pedido", "Cliente", "Conta", "Valor", "Status", "Data"]}>
          {orders.map((order) => (
            <tr key={order.id} className="transition-colors hover:bg-surface-2/30">
              <td className="px-4 py-3 font-semibold">{order.reference}</td>
              <td className="px-4 py-3 text-muted-foreground">{order.customerName}</td>
              <td className="px-4 py-3">{order.accountTitle}</td>
              <td className="px-4 py-3 font-semibold">{formatPrice(order.amount)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(order.date)}</td>
            </tr>
          ))}
        </DataTable>
      </section>
    </AdminShell>
  );
}
