import * as React from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getAccount } from "@/mock/accounts";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/checkout/$id")({
  loader: ({ params }) => {
    const account = getAccount(params.id);
    if (!account) throw notFound();
    return { account };
  },
  head: () => ({
    meta: [
      { title: "Checkout | Plutão Shop" },
      { name: "description", content: "Reveja o resumo do pedido antes de finalizar a compra." },
      { property: "og:title", content: "Checkout | Plutão Shop" },
      { property: "og:description", content: "Resumo do pedido na Plutão Shop." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { account } = Route.useLoaderData();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setTimeout(() => {
      navigate({ to: "/compra/sucesso" });
    }, 2000);
  };

  return (
    <StoreLayout>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold">Finalizar compra</h1>
        <p className="mt-2 text-muted-foreground">
          Fluxo de demonstração — nenhum pagamento real é processado.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <form onSubmit={submit} className="surface-panel space-y-5 p-6">
            <h2 className="font-bold">Dados de faturação</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" htmlFor="nome">
                <Input id="nome" placeholder="João Martins" required />
              </Field>
              <Field label="Email" htmlFor="email">
                <Input id="email" type="email" placeholder="joao@example.test" required />
              </Field>
            </div>
            <Field label="País" htmlFor="pais">
              <Input id="pais" placeholder="Portugal" />
            </Field>

            <div className="rounded-xl border border-border bg-surface/50 p-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <Lock className="size-4 text-primary" /> Pagamento simulado
              </p>
              <p className="mt-1.5">
                Não são pedidos dados de cartão. Ao continuar, a compra é simulada apenas
                visualmente.
              </p>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> A processar...
                </>
              ) : (
                "Continuar para pagamento"
              )}
            </Button>
          </form>

          <aside className="surface-panel h-fit p-6">
            <h2 className="font-bold">Resumo do pedido</h2>
            <div className="mt-5 flex gap-4">
              <img
                src={account.images[0]}
                alt={account.title}
                loading="lazy"
                width={1024}
                height={640}
                className="size-20 rounded-lg object-cover"
              />
              <div>
                <p className="font-semibold">{account.title}</p>
                <p className="text-xs text-muted-foreground">
                  Nível {account.level} · {account.server}
                </p>
                <p className="mt-1 text-sm font-bold">{formatPrice(account.price)}</p>
              </div>
            </div>

            <dl className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatPrice(account.price)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd className="gold-text">{formatPrice(account.price)}</dd>
              </div>
            </dl>

            <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Os dados da conta ficam disponíveis na sua área de cliente após a confirmação.
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
