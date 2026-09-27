import { createFileRoute, Link } from "@tanstack/react-router";
import { Headphones, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { myOrders } from "@/mock/orders";
import { useSession } from "@/lib/session";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Visão geral | Plutão Shop" },
      { name: "description", content: "Resumo das suas compras e pedidos na Plutão Shop." },
      { property: "og:title", content: "Visão geral | Plutão Shop" },
      { property: "og:description", content: "Área de cliente da Plutão Shop." },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const { user } = useSession();
  const lastOrder = myOrders[0];
  return (
    <DashboardShell
      title={`Olá, ${user?.name.split(" ")[0] ?? ""} 👋`}
      description="Bem-vindo de volta à Plutão Shop."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Compras realizadas"
          value={String(myOrders.length)}
          icon={<ShoppingBag className="size-4" />}
        />
        <StatCard
          label="Última compra"
          value={lastOrder ? formatPrice(lastOrder.amount) : "—"}
          hint={lastOrder ? formatDate(lastOrder.date) : undefined}
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label="Pedidos"
          value={String(myOrders.length)}
          icon={<Receipt className="size-4" />}
        />
        <StatCard label="Suporte" value="Disponível" icon={<Headphones className="size-4" />} />
      </div>

      <section className="surface-panel mt-8 p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-bold">Compras recentes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/compras">Ver todas</Link>
          </Button>
        </div>
        <ul className="divide-y divide-border/70">
          {myOrders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{order.accountTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {order.reference} · {formatDate(order.date)}
                </p>
              </div>
              <StatusBadge status={order.status} />
              <p className="font-bold">{formatPrice(order.amount)}</p>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/compras/$id" params={{ id: order.id }}>
                  Ver detalhes
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
