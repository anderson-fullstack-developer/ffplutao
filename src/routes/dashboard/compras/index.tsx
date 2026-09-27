import { createFileRoute, Link } from "@tanstack/react-router";
import { ImageOff, KeyRound, ShoppingBag } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/misc";
import { listMyOrdersFn } from "@/functions/orders";
import { centsToEuros } from "@/lib/catalog";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/dashboard/compras/")({
  loader: () => listMyOrdersFn(),
  head: () => ({
    meta: [{ title: "Minhas compras | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: Compras,
});

function Compras() {
  const orders = Route.useLoaderData();

  if (!orders.length) {
    return (
      <DashboardShell title="Minhas compras">
        <EmptyState
          icon={<ShoppingBag className="size-6" />}
          title="Ainda não fez nenhuma compra."
          description="Explore o catálogo e encontre a conta ideal para si."
          actionLabel="Explorar contas"
          actionTo="/contas"
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Minhas compras"
      description="As contas que comprou. Abra uma compra para ver os dados de acesso."
    >
      <div className="grid gap-4">
        {orders.map((order) => (
          <article
            key={order.id}
            className="surface-panel flex flex-wrap items-center gap-5 p-5 transition-colors hover:border-primary/40"
          >
            {order.coverUrl ? (
              <img
                src={order.coverUrl}
                alt=""
                loading="lazy"
                className="aspect-[16/10] w-28 rounded-lg object-cover"
              />
            ) : (
              <span className="flex aspect-[16/10] w-28 items-center justify-center rounded-lg bg-surface text-muted-foreground">
                <ImageOff className="size-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold">{order.accountTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pedido {order.reference} · {formatDate(order.paidAt ?? order.createdAt)} · Nível{" "}
                {order.accountLevel} · {order.accountServer}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status} />
                {order.credentialsReady ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <KeyRound className="size-3.5" /> Dados disponíveis
                  </span>
                ) : null}
              </div>
            </div>
            <p className="gold-text font-display text-xl font-extrabold">
              {formatPrice(centsToEuros(order.amountCents))}
            </p>
            <Button asChild variant={order.credentialsReady ? "primary" : "outline"}>
              <Link to="/dashboard/compras/$id" params={{ id: order.id }}>
                {order.credentialsReady ? "Ver dados da conta" : "Ver detalhes"}
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
