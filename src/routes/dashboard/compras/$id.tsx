import * as React from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Eye, Lock, ShieldAlert } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { getOrder } from "@/mock/orders";
import { getAccount } from "@/mock/accounts";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/dashboard/compras/$id")({
  loader: ({ params }) => {
    const order = getOrder(params.id);
    if (!order) throw notFound();
    return { order };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Pedido ${loaderData?.order.reference ?? ""} | Plutão Shop` },
      { name: "description", content: "Detalhes do pedido e dados da conta adquirida." },
      { property: "og:title", content: "Detalhes da compra | Plutão Shop" },
      { property: "og:description", content: "Consulte o estado e os dados do seu pedido." },
    ],
  }),
  component: CompraDetalhe,
});

function CompraDetalhe() {
  const { order } = Route.useLoaderData();
  const account = getAccount(order.accountId);
  const [revealed, setRevealed] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value);
    toast.success("Copiado para a área de transferência");
  };

  return (
    <DashboardShell title={`Pedido ${order.reference}`} description={`Realizado em ${formatDate(order.date)}`}>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="surface-panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-bold">Resumo do pedido</h2>
              <StatusBadge status={order.status} />
            </div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <Row label="Pedido" value={order.reference} />
              <Row label="Data" value={formatDate(order.date)} />
              <Row label="Valor" value={formatPrice(order.amount)} />
              <Row label="Pagamento" value={order.paymentMethod} />
            </dl>
          </section>

          <section className="surface-panel border-primary/30 bg-primary/5 p-6">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 size-5 text-primary" />
              <div>
                <h2 className="font-bold">Dados da conta</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Demonstração visual com credenciais fictícias.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Credential
                label="Email/Login"
                value={order.credentials.login}
                revealed={revealed}
                onCopy={copy}
              />
              <Credential
                label="Senha"
                value={order.credentials.password}
                revealed={revealed}
                onCopy={copy}
              />
            </div>

            {!revealed ? (
              <Button className="mt-5" onClick={() => setConfirmOpen(true)}>
                <Eye className="size-4" /> Revelar dados
              </Button>
            ) : (
              <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="size-4 text-primary" />
                Nunca partilhe estas credenciais com terceiros.
              </p>
            )}
          </section>
        </div>

        <aside className="surface-panel h-fit p-6">
          <h2 className="font-bold">Produto</h2>
          {account ? (
            <>
              <img
                src={account.images[0]}
                alt={account.title}
                loading="lazy"
                width={1024}
                height={640}
                className="mt-4 aspect-[16/10] w-full rounded-lg object-cover"
              />
              <p className="mt-4 font-semibold">{account.title}</p>
              <p className="text-xs text-muted-foreground">
                Nível {account.level} · {account.server} · {account.skins}+ skins
              </p>
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link to="/contas/$id" params={{ id: account.id }}>
                  Ver anúncio
                </Link>
              </Button>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{order.accountTitle}</p>
          )}
        </aside>
      </div>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Revelar dados da conta?"
        description="Você está prestes a visualizar os dados associados a esta compra."
        confirmLabel="Revelar dados"
        onConfirm={() => setRevealed(true)}
      />
    </DashboardShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

function Credential({
  label,
  value,
  revealed,
  onCopy,
}: {
  label: string;
  value: string;
  revealed: boolean;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm font-semibold">
          {revealed ? value : "••••••••••••••••"}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={!revealed}
        onClick={() => onCopy(value)}
      >
        <Copy className="size-4" /> Copiar {label === "Senha" ? "senha" : "login"}
      </Button>
    </div>
  );
}
