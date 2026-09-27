import { createFileRoute, Link } from "@tanstack/react-router";
import { Headphones, ShoppingBag, Wallet, Receipt } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState, StatCard } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { getMyDashboardFn } from "@/functions/orders";
import { centsToEuros } from "@/lib/catalog";
import { useSession } from "@/lib/session";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/dashboard/")({
  loader: () => getMyDashboardFn(),
  head: () => ({
    meta: [{ title: "Visão geral | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardHome,
});

const euros = (cents: number) => formatPrice(centsToEuros(cents));

function DashboardHome() {
  const { user } = useSession();
  const data = Route.useLoaderData();

  return (
    <DashboardShell
      title={`Olá, ${user?.name.split(" ")[0] ?? ""} 👋`}
      description="Bem-vindo de volta à Plutão Shop."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Contas compradas"
          value={String(data.purchases)}
          icon={<ShoppingBag className="size-4" />}
        />
        <StatCard
          label="Total gasto"
          value={euros(data.totalSpentCents)}
          icon={<Receipt className="size-4" />}
        />
        <StatCard
          label="Última compra"
          value={data.lastPurchase ? euros(data.lastPurchase.amountCents) : "—"}
          hint={data.lastPurchase ? formatDate(data.lastPurchase.paidAt) : undefined}
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label="Ajuda"
          value={data.openTickets ? `${data.openTickets} em aberto` : "Disponível"}
          icon={<Headphones className="size-4" />}
        />
      </div>

      <section className="surface-panel mt-8 p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-bold">Compras recentes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/compras">Ver todas</Link>
          </Button>
        </div>
        {data.recent.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="size-6" />}
            title="Ainda não fez nenhuma compra."
            description="Explore o catálogo e encontre a conta ideal para si."
            actionLabel="Explorar contas"
            actionTo="/contas"
          />
        ) : (
          <ul className="divide-y divide-border/70">
            {data.recent.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{order.accountTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.reference} · {formatDate(order.paidAt ?? order.createdAt)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
                <p className="font-bold">{euros(order.amountCents)}</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/dashboard/compras/$id" params={{ id: order.id }}>
                    {order.credentialsReady ? "Ver dados" : "Ver detalhes"}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}
