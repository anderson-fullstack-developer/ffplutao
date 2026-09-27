import * as React from "react";
import { createFileRoute, Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  CreditCard,
  ImageOff,
  Loader2,
  Lock,
  ShieldCheck,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { CheckoutConsent } from "@/components/store/checkout-consent";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCartAccountsFn } from "@/functions/catalog";
import { startCheckoutFn } from "@/functions/checkout";
import { useCart } from "@/lib/cart";
import { centsToEuros } from "@/lib/catalog";
import { cn, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [{ title: "Carrinho | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: Carrinho,
});

function Carrinho() {
  const cart = useCart();
  const { user } = useRouteContext({ from: "__root__" });
  const navigate = useNavigate();
  const [paying, setPaying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [accepted, setAccepted] = React.useState(false);

  // Preço e disponibilidade SEMPRE atuais, vindos do servidor.
  const {
    data: accounts,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["cart-accounts", cart.ids],
    queryFn: () => getCartAccountsFn({ data: { ids: cart.ids } }),
    enabled: cart.ids.length > 0,
    refetchOnWindowFocus: true,
  });

  // Contas que deixaram de existir na loja (removidas/ocultas) saem do carrinho.
  React.useEffect(() => {
    if (!accounts) return;
    const known = new Set(accounts.map((account) => account.id));
    const gone = cart.ids.filter((id) => !known.has(id));
    if (gone.length) cart.removeMany(gone);
  }, [accounts, cart]);

  const available = (accounts ?? []).filter((account) => account.status === "AVAILABLE");
  const unavailable = (accounts ?? []).filter((account) => account.status !== "AVAILABLE");
  const total = available.reduce((sum, account) => sum + account.priceCents, 0);

  const pay = async () => {
    if (!user) {
      await navigate({ to: "/login", search: { redirect: "/carrinho" } });
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const result = await startCheckoutFn({
        data: { accountIds: available.map((account) => account.id), acceptTerms: accepted },
      });
      if (!result.ok) {
        setError(result.error);
        await refetch();
        setPaying(false);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError("Não foi possível iniciar o pagamento. Tente novamente.");
      setPaying(false);
    }
  };

  return (
    <StoreLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold">Carrinho</h1>

        {cart.count === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={<ShoppingCart className="size-6" />}
              title="O seu carrinho está vazio."
              description="Adicione contas ao carrinho para as pagar todas de uma vez."
              actionLabel="Ver contas"
              onAction={() => void navigate({ to: "/contas" })}
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <section>
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {cart.count} {cart.count === 1 ? "conta" : "contas"}
                </span>
                <button
                  type="button"
                  onClick={() => cart.clear()}
                  className="cursor-pointer hover:text-destructive"
                >
                  Esvaziar carrinho
                </button>
              </div>

              {isLoading ? (
                <div className="surface-panel flex justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ul className="space-y-3">
                  {(accounts ?? []).map((account) => {
                    const ok = account.status === "AVAILABLE";
                    const cover = account.images[0];
                    return (
                      <li
                        key={account.id}
                        className={cn("surface-panel flex gap-4 p-3 sm:p-4", !ok && "opacity-70")}
                      >
                        <Link
                          to="/contas/$id"
                          params={{ id: account.id }}
                          className="shrink-0 overflow-hidden rounded-lg"
                        >
                          {cover ? (
                            <img
                              src={cover.thumbUrl}
                              alt=""
                              loading="lazy"
                              className="aspect-[16/10] w-28 object-cover sm:w-36"
                            />
                          ) : (
                            <span className="flex aspect-[16/10] w-28 items-center justify-center bg-surface text-muted-foreground sm:w-36">
                              <ImageOff className="size-5" />
                            </span>
                          )}
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              to="/contas/$id"
                              params={{ id: account.id }}
                              className="truncate font-semibold hover:text-primary"
                            >
                              {account.title}
                            </Link>
                            <p className="shrink-0 font-bold">
                              {formatPrice(centsToEuros(account.priceCents))}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Nível {account.level} · {account.server} · {account.skins}+ skins
                          </p>
                          <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                            {ok ? (
                              <StatusBadge status="AVAILABLE" />
                            ) : (
                              <span className="text-xs font-semibold text-warning">
                                {account.status === "SOLD"
                                  ? "Vendida — já não pode ser comprada"
                                  : "Reservada por outro cliente — tente mais tarde"}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => cart.remove(account.id)}
                              className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" /> Remover
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <aside className="surface-panel h-fit space-y-5 p-6 lg:sticky lg:top-32">
              <h2 className="font-bold">Resumo</h2>
              {error ? <FormError message={error} /> : null}
              <dl className="space-y-2 text-sm">
                {available.map((account) => (
                  <div key={account.id} className="flex justify-between gap-3">
                    <dt className="truncate text-muted-foreground">{account.title}</dt>
                    <dd>{formatPrice(centsToEuros(account.priceCents))}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                  <dt>Total</dt>
                  <dd className="gold-text">{formatPrice(centsToEuros(total))}</dd>
                </div>
              </dl>
              {unavailable.length ? (
                <p className="text-xs text-warning">
                  {unavailable.length === 1
                    ? "1 conta indisponível não entra no pagamento."
                    : `${unavailable.length} contas indisponíveis não entram no pagamento.`}
                </p>
              ) : null}

              <CheckoutConsent checked={accepted} onChange={setAccepted} />

              <Button
                size="lg"
                className="w-full"
                disabled={paying || isLoading || available.length === 0 || !accepted}
                onClick={() => void pay()}
              >
                {paying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> A abrir o pagamento...
                  </>
                ) : (
                  `Pagar ${formatPrice(centsToEuros(total))}`
                )}
              </Button>
              {!user ? (
                <p className="text-center text-xs text-muted-foreground">
                  Vai entrar ou criar conta antes de pagar. O carrinho fica guardado.
                </p>
              ) : null}

              <ul className="space-y-2.5 border-t border-border pt-4 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <CreditCard className="size-4 shrink-0 text-primary" /> Cartão, Apple Pay e Google
                  Pay — um só pagamento para todas as contas.
                </li>
                <li className="flex gap-2">
                  <Clock className="size-4 shrink-0 text-primary" /> As contas ficam reservadas para
                  si durante 30 minutos ao carregar em Pagar.
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="size-4 shrink-0 text-primary" /> Se alguma conta deixar de
                  estar disponível, o valor dela é devolvido automaticamente.
                </li>
                <li className="flex gap-2">
                  <Lock className="size-4 shrink-0 text-primary" /> Nunca vemos nem guardamos os
                  dados do seu cartão.
                </li>
              </ul>
            </aside>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
