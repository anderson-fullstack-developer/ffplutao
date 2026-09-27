import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/misc";
import { myOrders } from "@/mock/orders";
import { getAccount } from "@/mock/accounts";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/dashboard/compras/")({
  head: () => ({
    meta: [
      { title: "Minhas compras | Plutão Shop" },
      { name: "description", content: "Veja o histórico das suas compras na Plutão Shop." },
      { property: "og:title", content: "Minhas compras | Plutão Shop" },
      { property: "og:description", content: "Histórico de pedidos da sua conta." },
    ],
  }),
  component: Compras,
});

function Compras() {
  if (!myOrders.length) {
    return (
      <DashboardShell title="Minhas compras">
        <EmptyState
          icon={<ShoppingBag className="size-6" />}
          title="Você ainda não realizou nenhuma compra."
          description="Explore o catálogo e encontre a conta ideal para você."
          actionLabel="Explorar contas"
          actionTo="/contas"
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Minhas compras" description="Todos os seus pedidos num só lugar.">
      <div className="grid gap-4">
        {myOrders.map((order) => {
          const account = getAccount(order.accountId);
          return (
            <article
              key={order.id}
              className="surface-panel flex flex-wrap items-center gap-5 p-5 transition-colors hover:border-primary/40"
            >
              {account ? (
                <img
                  src={account.images[0]}
                  alt={order.accountTitle}
                  loading="lazy"
                  width={1024}
                  height={640}
                  className="size-20 rounded-lg object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-bold">{order.accountTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pedido {order.reference} · {formatDate(order.date)}
                </p>
                <div className="mt-2">
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <p className="gold-text font-display text-xl font-extrabold">
                {formatPrice(order.amount)}
              </p>
              <Button asChild variant="outline">
                <Link to="/dashboard/compras/$id" params={{ id: order.id }}>
                  Ver detalhes
                </Link>
              </Button>
            </article>
          );
        })}
      </div>
    </DashboardShell>
  );
}
