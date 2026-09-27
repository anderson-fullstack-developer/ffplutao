import * as React from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { getOrderStatusFn } from "@/functions/checkout";
import { centsToEuros } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

/**
 * Página de regresso do Stripe. NÃO confirma nada por si: pergunta ao servidor, que só
 * considera o pedido pago com dados vindos do Stripe (webhook ou consulta com a chave secreta).
 */
export const Route = createFileRoute("/compra/sucesso")({
  validateSearch: z.object({ pedido: z.string().uuid().optional().catch(undefined) }),
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
  const { pedido } = Route.useSearch();
  const [startedAt] = React.useState(() => Date.now());

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-status", pedido],
    queryFn: () => getOrderStatusFn({ data: { orderId: pedido! } }),
    enabled: Boolean(pedido),
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING" && Date.now() - startedAt < MAX_WAIT_MS ? 2500 : false,
  });

  const waitedTooLong = order?.status === "PENDING" && Date.now() - startedAt >= MAX_WAIT_MS;

  let content: React.ReactNode;
  if (!pedido || (!isLoading && !order)) {
    content = (
      <Status
        icon={<AlertTriangle className="size-9" />}
        tone="warning"
        title="Pedido não encontrado"
        text="Consulte as suas compras na área de cliente."
      />
    );
  } else if (isLoading || !order || order.status === "PENDING") {
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
  } else if (order.status === "PAID") {
    content = (
      <Status
        icon={<CheckCircle2 className="size-9" />}
        tone="success"
        title="Compra concluída!"
        text="Os dados da conta já estão disponíveis na sua área de cliente."
      />
    );
  } else {
    content = (
      <Status
        icon={<AlertTriangle className="size-9" />}
        tone="warning"
        title={order.status === "REFUNDED" ? "Pagamento reembolsado" : "Pagamento não concluído"}
        text={
          order.status === "REFUNDED"
            ? "A conta deixou de estar disponível antes da confirmação. O valor foi reembolsado automaticamente para o seu cartão."
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

          {order ? (
            <dl className="mt-8 space-y-2 rounded-xl border border-border bg-surface/50 p-5 text-left text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Pedido</dt>
                <dd className="font-semibold">{order.reference}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Conta</dt>
                <dd className="text-right">{order.accountTitle}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="gold-text font-bold">
                  {formatPrice(centsToEuros(order.amountCents))}
                </dd>
              </div>
            </dl>
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
