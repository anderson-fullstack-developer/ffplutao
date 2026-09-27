import * as React from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { z } from "zod";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { cancelCheckoutFn } from "@/functions/checkout";

type View = Awaited<ReturnType<typeof cancelCheckoutFn>>;

/** Regresso da página de pagamento sem pagar: cancela e liberta as contas reservadas. */
export const Route = createFileRoute("/compra/cancelada")({
  validateSearch: z.object({ grupo: z.string().uuid().optional().catch(undefined) }),
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  head: () => ({
    meta: [{ title: "Pagamento cancelado | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: Cancelada,
});

function Cancelada() {
  const { grupo } = Route.useSearch();
  const [checkout, setCheckout] = React.useState<View | undefined>(undefined);

  React.useEffect(() => {
    if (!grupo) {
      setCheckout(null);
      return;
    }
    cancelCheckoutFn({ data: { groupId: grupo } })
      .then(setCheckout)
      .catch(() => setCheckout(null));
  }, [grupo]);

  const paid = checkout?.status === "PAID" || checkout?.status === "PARTIAL";
  const many = (checkout?.items.length ?? 0) > 1;

  return (
    <StoreLayout>
      <div className="ember-bg flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="surface-panel w-full max-w-lg p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            {checkout === undefined ? (
              <Loader2 className="size-9 animate-spin" />
            ) : paid ? (
              <CheckCircle2 className="size-9" />
            ) : (
              <XCircle className="size-9" />
            )}
          </div>
          <h1 className="font-display mt-6 text-3xl font-extrabold">
            {checkout === undefined
              ? "A cancelar..."
              : paid
                ? "Afinal o pagamento foi concluído"
                : "Pagamento cancelado"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {paid
              ? "A compra foi confirmada. Os dados estão na sua área de cliente."
              : many
                ? "Nada foi cobrado. As contas voltaram a ficar disponíveis e continuam no seu carrinho."
                : "Nada foi cobrado. A conta voltou a ficar disponível na loja."}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {paid ? (
              <Button asChild size="lg">
                <Link to="/dashboard/compras">Minhas compras</Link>
              </Button>
            ) : many ? (
              <Button asChild size="lg">
                <Link to="/carrinho">Voltar ao carrinho</Link>
              </Button>
            ) : checkout?.items[0] ? (
              <Button asChild size="lg">
                <Link to="/contas/$id" params={{ id: checkout.items[0].accountId }}>
                  Voltar à conta
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link to="/carrinho">Ver carrinho</Link>
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
