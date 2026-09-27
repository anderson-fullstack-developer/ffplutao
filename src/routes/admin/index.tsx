import { createFileRoute, Link } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";
import { AdminShell, DataTable } from "@/components/admin/admin-shell";
import { EmptyState, StatCard } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminDashboardFn } from "@/functions/admin";
import { centsToEuros } from "@/lib/catalog";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  loader: () => getAdminDashboardFn(),
  head: () => ({
    meta: [{ title: "Painel admin | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminDashboard,
});

const euros = (cents: number) => formatPrice(centsToEuros(cents));

function AdminDashboard() {
  const stats = Route.useLoaderData();
  const max = Math.max(0, ...stats.daily.map((d) => d.cents));

  const cards = [
    {
      label: "Vendas",
      value: euros(stats.totalSalesCents),
      hint: `${euros(stats.salesLast30Cents)} nos últimos 30 dias`,
    },
    { label: "Pedidos", value: String(stats.ordersCount), hint: `${stats.paidOrdersCount} pagos` },
    {
      label: "Contas disponíveis",
      value: String(stats.availableCount),
      hint: `${stats.reservedCount} reservadas agora`,
    },
    { label: "Contas vendidas", value: String(stats.soldCount) },
    {
      label: "Clientes",
      value: String(stats.customersCount),
      hint: `+${stats.newCustomers30} nos últimos 30 dias`,
    },
  ];

  return (
    <AdminShell title="Dashboard" description="Visão geral da operação da loja.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
        ))}
      </div>

      <section className="surface-panel mt-8 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">Vendas nos últimos 30 dias</h2>
          <p className="text-sm text-muted-foreground">{euros(stats.salesLast30Cents)}</p>
        </div>
        <div className="mt-6 flex h-52 items-end gap-1 sm:gap-2">
          {stats.daily.map((point, index) => (
            <div
              key={point.day}
              className="flex h-full flex-1 flex-col items-center justify-end gap-2"
            >
              <div
                className={
                  point.cents > 0
                    ? "gold-surface w-full rounded-t-md transition-all hover:brightness-110"
                    : "w-full rounded-t-md bg-border/60"
                }
                style={{
                  height:
                    max > 0 && point.cents > 0
                      ? `${Math.max((point.cents / max) * 92, 4)}%`
                      : "2px",
                }}
                title={`${point.day}: ${euros(point.cents)}`}
              />
              <span className="hidden text-[10px] text-muted-foreground sm:block">
                {index % 5 === 0 || index === stats.daily.length - 1 ? point.day.slice(0, 2) : ""}
              </span>
            </div>
          ))}
        </div>
        {max === 0 ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ainda sem vendas neste período.
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Pedidos recentes</h2>
          <Link to="/admin/pedidos" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        {stats.recentOrders.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="size-6" />}
            title="Ainda não há pedidos."
            description="Os pedidos aparecem aqui quando os pagamentos estiverem ativos (Fase 5)."
          />
        ) : (
          <DataTable headers={["Pedido", "Cliente", "Conta", "Valor", "Estado", "Data"]}>
            {stats.recentOrders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-surface-2/30">
                <td className="px-4 py-3 font-semibold">{order.reference}</td>
                <td className="px-4 py-3 text-muted-foreground">{order.customerName}</td>
                <td className="px-4 py-3">{order.accountTitle}</td>
                <td className="px-4 py-3 font-semibold">{euros(order.amountCents)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </AdminShell>
  );
}
