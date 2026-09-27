import * as React from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { z } from "zod";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { cancelCheckoutFn } from "@/functions/checkout";

type View = Awaited<ReturnType<typeof cancelCheckoutFn>>;

/** Regresso do Stripe sem pagar: cancela o checkout e liberta a reserva da conta. */
export const Route = createFileRoute("/compra/cancelada")({
  validateSearch: z.object({ pedido: z.string().uuid().optional().catch(undefined) }),
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  head: () => ({
    meta: [{ title: "Pagamento cancelado | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: Cancelada,
});

function Cancelada() {
  const { pedido } = Route.useSearch();
  const [order, setOrder] = React.useState<View | undefined>(undefined);

  React.useEffect(() => {
    if (!pedido) {
      setOrder(null);
      return;
    }
    cancelCheckoutFn({ data: { orderId: pedido } })
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [pedido]);

  const paid = order?.status === "PAID";

  return (
    <StoreLayout>
      <div className="ember-bg flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="surface-panel w-full max-w-lg p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            {order === undefined ? (
              <Loader2 className="size-9 animate-spin" />
            ) : paid ? (
              <CheckCircle2 className="size-9" />
            ) : (
              <XCircle className="size-9" />
            )}
          </div>
          <h1 className="font-display mt-6 text-3xl font-extrabold">
            {order === undefined
              ? "A cancelar..."
              : paid
                ? "Afinal o pagamento foi concluído"
                : "Pagamento cancelado"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {paid
              ? "A compra foi confirmada. Os dados estão na sua área de cliente."
              : "Nada foi cobrado. A conta voltou a ficar disponível na loja."}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {order && !paid ? (
              <Button asChild size="lg">
                <Link to="/contas/$id" params={{ id: order.accountId }}>
                  Voltar à conta
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link to="/dashboard/compras">Minhas compras</Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline">
              <Link to="/contas">Ver outras contas</Link>
            </Button>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
