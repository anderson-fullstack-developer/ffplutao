import * as React from "react";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { Clock, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { startCheckoutFn } from "@/functions/checkout";
import { getPublicAccountFn } from "@/functions/catalog";
import { centsToEuros } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/checkout/$id")({
  // Comprar exige sessão iniciada.
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user: context.user };
  },
  loader: async ({ params }) => {
    const account = await getPublicAccountFn({ data: { id: params.id } });
    if (!account) throw notFound();
    return { account };
  },
  head: () => ({
    meta: [{ title: "Finalizar compra | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: Checkout,
});

function Checkout() {
  const { account } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const available = account.status === "AVAILABLE";
  const price = formatPrice(centsToEuros(account.priceCents));

  const pay = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await startCheckoutFn({ data: { accountId: account.id } });
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // Página de pagamento segura do Stripe (os dados do cartão nunca passam por nós).
      window.location.assign(result.url);
    } catch {
      setError("Não foi possível iniciar o pagamento. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <StoreLayout>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold">Finalizar compra</h1>
        <p className="mt-2 text-muted-foreground">
          Reveja o pedido. O pagamento é feito na página segura do Stripe.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className="surface-panel space-y-5 p-6">
            <h2 className="font-bold">Pagamento</h2>

            {error ? <FormError message={error} /> : null}
            {!available ? (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
                {account.status === "SOLD"
                  ? "Esta conta já foi vendida."
                  : "Esta conta está reservada por outro cliente. Tente dentro de alguns minutos."}
              </p>
            ) : null}

            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-primary" />
                Cartão de crédito/débito, Apple Pay ou Google Pay, processados pelo Stripe.
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                Ao continuar, a conta fica reservada para si durante 30 minutos.
              </li>
              <li className="flex gap-3">
                <Lock className="mt-0.5 size-4 shrink-0 text-primary" />A Plutão Shop nunca vê nem
                guarda os dados do seu cartão.
              </li>
            </ul>

            <p className="text-sm text-muted-foreground">
              Comprador: <span className="font-semibold text-foreground">{user.email}</span>
            </p>

            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={loading || !available}
              onClick={() => void pay()}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> A abrir o pagamento...
                </>
              ) : (
                `Pagar ${price} com Stripe`
              )}
            </Button>
          </section>

          <aside className="surface-panel h-fit p-6">
            <h2 className="font-bold">Resumo do pedido</h2>
            <div className="mt-5 flex gap-4">
              {account.images[0] ? (
                <img
                  src={account.images[0].thumbUrl}
                  alt={account.title}
                  loading="lazy"
                  className="size-20 rounded-lg object-cover"
                />
              ) : null}
              <div>
                <p className="font-semibold">{account.title}</p>
                <p className="text-xs text-muted-foreground">
                  Nível {account.level} · {account.server}
                </p>
                <p className="mt-1 text-sm font-bold">{price}</p>
              </div>
            </div>

            <dl className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{price}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd className="gold-text">{price}</dd>
              </div>
            </dl>

            <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Os dados da conta ficam disponíveis na sua área de cliente após a confirmação do
              pagamento.
            </p>

            <Button asChild variant="ghost" className="mt-4 w-full">
              <Link to="/contas/$id" params={{ id: account.id }}>
                Voltar à conta
              </Link>
            </Button>
          </aside>
        </div>
      </div>
    </StoreLayout>
  );
}
