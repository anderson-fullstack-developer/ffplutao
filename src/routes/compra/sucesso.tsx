import * as React from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCheckoutStatusFn } from "@/functions/checkout";
import { useCart } from "@/lib/cart";
import { centsToEuros } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

/**
 * Página de regresso do pagamento. NÃO confirma nada por si: pergunta ao servidor, que só
 * considera o pagamento feito com dados vindos do processador de pagamentos.
 */
export const Route = createFileRoute("/compra/sucesso")({
  validateSearch: z.object({ grupo: z.string().uuid().optional().catch(undefined) }),
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  head: () => ({
    meta: [{ title: "Pagamento | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: Sucesso,
});

const MAX_WAIT_MS = 2 * 60 * 1000;

function Sucesso() {
  const { grupo } = Route.useSearch();
  const cart = useCart();
  const [startedAt] = React.useState(() => Date.now());

  const { data: checkout, isLoading } = useQuery({
    queryKey: ["checkout-status", grupo],
    queryFn: () => getCheckoutStatusFn({ data: { groupId: grupo! } }),
    enabled: Boolean(grupo),
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING" && Date.now() - startedAt < MAX_WAIT_MS ? 2500 : false,
  });

  // Contas pagas saem do carrinho.
  React.useEffect(() => {
    if (!checkout || checkout.status === "PENDING") return;
    const bought = checkout.items.filter((i) => i.status === "PAID").map((i) => i.accountId);
    if (bought.some((id) => cart.has(id))) cart.removeMany(bought);
  }, [checkout, cart]);

  const waitedTooLong = checkout?.status === "PENDING" && Date.now() - startedAt >= MAX_WAIT_MS;
  const paidCount = checkout?.items.filter((i) => i.status === "PAID").length ?? 0;

  let content: React.ReactNode;
  if (!grupo || (!isLoading && !checkout)) {
    content = (
      <Status
        icon={<AlertTriangle className="size-9" />}
        tone="warning"
        title="Pagamento não encontrado"
        text="Consulte as suas compras na área de cliente."
      />
    );
  } else if (isLoading || !checkout || checkout.status === "PENDING") {
    content = (
      <Status
        icon={<Loader2 className="size-9 animate-spin" />}
        tone="neutral"
        title="A confirmar o pagamento..."
        text={
          waitedTooLong
            ? "A confirmação está a demorar mais do que o normal. Pode fechar esta página: assim que o pagamento for confirmado, a compra aparece nas suas compras."
            : "Estamos a aguardar a confirmação do pagamento. Isto demora normalmente poucos segundos."
        }
      />
    );
  } else if (checkout.status === "PAID") {
    content = (
      <Status
        icon={<CheckCircle2 className="size-9" />}
        tone="success"
        title="Compra concluída!"
        text={
          paidCount > 1
            ? "Os dados das contas já estão disponíveis na sua área de cliente."
            : "Os dados da conta já estão disponíveis na sua área de cliente."
        }
      />
    );
  } else if (checkout.status === "PARTIAL") {
    content = (
      <Status
        icon={<CheckCircle2 className="size-9" />}
        tone="success"
        title="Compra concluída (em parte)"
        text="Uma ou mais contas foram vendidas a outra pessoa antes da confirmação. O valor dessas contas foi devolvido automaticamente ao seu cartão; as restantes já são suas."
      />
    );
  } else {
    content = (
      <Status
        icon={<AlertTriangle className="size-9" />}
        tone="warning"
        title={checkout.status === "REFUNDED" ? "Pagamento devolvido" : "Pagamento não concluído"}
        text={
          checkout.status === "REFUNDED"
            ? "As contas deixaram de estar disponíveis antes da confirmação. O valor foi devolvido automaticamente ao seu cartão."
            : "O pagamento não foi concluído e nada foi cobrado. Pode tentar novamente."
        }
      />
    );
  }

  return (
    <StoreLayout>
      <div className="ember-bg flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="surface-panel animate-scale-in w-full max-w-lg p-8 text-center">
          {content}

          {checkout ? (
            <div className="mt-8 rounded-xl border border-border bg-surface/50 p-5 text-left text-sm">
              <ul className="space-y-3">
                {checkout.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.accountTitle}</p>
                      <p className="text-xs text-muted-foreground">Pedido {item.reference}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-semibold">
                        {formatPrice(centsToEuros(item.amountCents))}
                      </span>
                      {checkout.status !== "PENDING" ? <StatusBadge status={item.status} /> : null}
                    </div>
                  </li>
                ))}
              </ul>
              {checkout.items.length > 1 ? (
                <div className="mt-4 flex justify-between border-t border-border pt-3 font-bold">
                  <span>Total</span>
                  <span className="gold-text">
                    {formatPrice(centsToEuros(checkout.totalCents))}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg">
              <Link to="/dashboard/compras">Ver minhas compras</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contas">Continuar a ver contas</Link>
            </Button>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}

function Status({
  icon,
  tone,
  title,
  text,
}: {
  icon: React.ReactNode;
  tone: "success" | "warning" | "neutral";
  title: string;
  text: string;
}) {
  const colors = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    neutral: "bg-primary/10 text-primary",
  }[tone];
  return (
    <>
      <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${colors}`}>
        {icon}
      </div>
      <h1 className="font-display mt-6 text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{text}</p>
    </>
  );
}
