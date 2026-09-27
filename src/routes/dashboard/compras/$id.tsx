import * as React from "react";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  ImageOff,
  Loader2,
  Lock,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { getMyOrderFn } from "@/functions/orders";
import { centsToEuros } from "@/lib/catalog";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/dashboard/compras/$id")({
  loader: async ({ params }) => {
    const order = await getMyOrderFn({ data: { orderId: params.id } });
    if (!order) throw notFound();
    return order;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Pedido ${loaderData?.reference ?? ""} | Plutão Shop` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompraDetalhe,
});

interface Credentials {
  login: string;
  password: string;
  recoveryEmail: string | null;
  instructions: string | null;
}

const STATUS_TEXT: Record<string, string> = {
  PENDING: "O pagamento ainda está a ser confirmado. Os dados aparecem aqui assim que terminar.",
  FAILED:
    "Esta conta foi vendida a outra pessoa antes de o seu pagamento ser confirmado. O valor vai ser devolvido ao seu cartão.",
  REFUNDED: "O valor desta compra foi devolvido ao seu cartão.",
};

function CompraDetalhe() {
  const order = Route.useLoaderData();
  const router = useRouter();
  const [credentials, setCredentials] = React.useState<Credentials | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reveal = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pedido direto ao servidor, que valida sessão, dono, pagamento e venda.
      const response = await fetch(`/api/orders/${order.id}/credentials`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = (await response.json()) as Credentials | { error: string };
      if (!response.ok || "error" in body) {
        setError("error" in body ? body.error : "Não foi possível obter os dados.");
        return;
      }
      setCredentials(body);
      void router.invalidate(); // atualiza "visto pela última vez"
    } catch {
      setError("Não foi possível obter os dados. Verifique a ligação e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell
      title={`Pedido ${order.reference}`}
      description={`Feito em ${formatDate(order.createdAt)}`}
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="surface-panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-bold">Resumo do pedido</h2>
              <StatusBadge status={order.status} />
            </div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <Row label="Pedido" value={order.reference} />
              <Row
                label="Data do pagamento"
                value={order.paidAt ? formatDateTime(order.paidAt) : "—"}
              />
              <Row label="Valor" value={formatPrice(centsToEuros(order.amountCents))} />
              <Row label="Pagamento" value="Cartão" />
            </dl>
          </section>

          <section className="surface-panel border-primary/30 bg-primary/5 p-6">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 size-5 text-primary" />
              <div>
                <h2 className="font-bold">Dados da conta</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Login e senha da conta que comprou. Só você tem acesso a estes dados.
                </p>
              </div>
            </div>

            {!order.credentialsReady ? (
              <p className="mt-5 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                {STATUS_TEXT[order.status] ?? "Os dados desta compra não estão disponíveis."}
              </p>
            ) : (
              <>
                <div className="mt-5 space-y-3">
                  <Credential label="Login / Email" value={credentials?.login ?? null} />
                  <Credential
                    label="Senha"
                    value={credentials?.password ?? null}
                    secret={!showPassword}
                    extra={
                      credentials ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                      ) : null
                    }
                  />
                  {credentials?.recoveryEmail ? (
                    <Credential label="Email de recuperação" value={credentials.recoveryEmail} />
                  ) : null}
                  {credentials?.instructions ? (
                    <div className="rounded-lg border border-border bg-background/60 px-4 py-3">
                      <p className="text-xs text-muted-foreground">Instruções</p>
                      <p className="mt-1 text-sm whitespace-pre-line">{credentials.instructions}</p>
                    </div>
                  ) : null}
                </div>

                {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

                {!credentials ? (
                  <Button className="mt-5" onClick={() => setConfirmOpen(true)} disabled={loading}>
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                    Revelar dados
                  </Button>
                ) : (
                  <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
                    Recomendamos que altere a senha e o email de recuperação da conta assim que
                    entrar. Nunca partilhe estes dados.
                  </p>
                )}

                {order.lastViewedAt ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Dados vistos {order.views} {order.views === 1 ? "vez" : "vezes"} · última em{" "}
                    {formatDateTime(order.lastViewedAt)}
                  </p>
                ) : null}
              </>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="surface-panel p-6">
            <h2 className="font-bold">Conta comprada</h2>
            {order.coverUrl ? (
              <img
                src={order.coverUrl}
                alt=""
                loading="lazy"
                className="mt-4 aspect-[16/10] w-full rounded-lg object-cover"
              />
            ) : (
              <span className="mt-4 flex aspect-[16/10] w-full items-center justify-center rounded-lg bg-surface text-muted-foreground">
                <ImageOff className="size-6" />
              </span>
            )}
            <p className="mt-4 font-semibold">{order.accountTitle}</p>
            <p className="text-xs text-muted-foreground">
              Nível {order.accountLevel} · {order.accountServer} · {order.accountSkins}+ skins
            </p>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link to="/contas/$id" params={{ id: order.accountId }}>
                Ver anúncio
              </Link>
            </Button>
          </div>
          <div className="surface-panel p-6 text-sm">
            <p className="font-semibold">Algum problema com esta conta?</p>
            <p className="mt-1 text-muted-foreground">
              Fale connosco e indique este pedido — respondemos na sua área de cliente.
            </p>
            <Button asChild variant="secondary" className="mt-4 w-full">
              <Link to="/suporte" search={{ pedido: order.id }}>
                <MessageSquare className="size-4" /> Pedir ajuda
              </Link>
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Revelar dados da conta?"
        description="Os dados vão aparecer no ecrã. Certifique-se de que ninguém está a ver. O acesso fica registado por segurança."
        confirmLabel="Revelar dados"
        onConfirm={() => void reveal()}
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
  secret,
  extra,
}: {
  label: string;
  value: string | null;
  secret?: boolean;
  extra?: React.ReactNode;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm font-semibold">
          {value === null
            ? "••••••••••••••••"
            : secret
              ? "•".repeat(Math.min(value.length, 16))
              : value}
        </p>
      </div>
      {extra}
      <Button size="sm" variant="outline" disabled={!value} onClick={() => void copy()}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copiar
      </Button>
    </div>
  );
}
