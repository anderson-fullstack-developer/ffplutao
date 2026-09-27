import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Headphones,
  LayoutGrid,
  ListChecks,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Zap,
} from "lucide-react";
import { StoreLayout } from "@/components/store/store-layout";
import { AccountGrid } from "@/components/store/account-card";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { getFeaturedFn } from "@/functions/catalog";
import { centsToEuros } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  loader: () => getFeaturedFn(),
  head: () => ({
    meta: [
      { title: "Plutão Shop | Contas Free Fire selecionadas" },
      {
        name: "description",
        content:
          "Explore contas de Free Fire selecionadas, veja skins, level e itens, e encontre a conta ideal para o seu estilo de jogo.",
      },
      { property: "og:title", content: "Plutão Shop | Contas Free Fire selecionadas" },
      {
        property: "og:description",
        content: "Catálogo premium de contas de Free Fire com todos os detalhes à vista.",
      },
    ],
  }),
  component: Home,
});

const heroPills = [
  "Compra simples",
  "Entrega digital",
  "Suporte ao cliente",
  "Catálogo atualizado",
];

const steps = [
  {
    icon: LayoutGrid,
    title: "Escolha uma conta",
    text: "Explore o catálogo e veja todos os detalhes.",
  },
  {
    icon: ListChecks,
    title: "Confira os detalhes",
    text: "Veja skins, level, região e itens disponíveis.",
  },
  { icon: ShoppingCart, title: "Realize a compra", text: "Fluxo de checkout simples e claro." },
  {
    icon: BadgeCheck,
    title: "Acesse sua compra",
    text: "Visualize a conta adquirida no seu dashboard.",
  },
];

const trust = [
  { icon: Sparkles, title: "Catálogo selecionado", text: "Cada conta é listada com detalhe." },
  { icon: ShoppingCart, title: "Compra simples", text: "Poucos passos até finalizar." },
  { icon: Headphones, title: "Suporte rápido", text: "Equipa disponível para ajudar." },
  { icon: Zap, title: "Entrega digital", text: "Acesso na sua área de cliente." },
];

function Home() {
  const { items: featuredAccounts, availableCount } = Route.useLoaderData();
  const [a, b, c] = featuredAccounts;

  return (
    <StoreLayout>
      {/* Hero */}
      <section className="ember-bg relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" />
              {availableCount} {availableCount === 1 ? "conta disponível" : "contas disponíveis"}
            </span>
            <h1 className="font-display mt-6 text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-6xl">
              Encontre a conta de <span className="gold-text">Free Fire</span> ideal para você
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Explore contas selecionadas, veja todos os detalhes e encontre a opção perfeita para o
              seu estilo de jogo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/contas">
                  Ver contas <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/como-funciona">Como funciona</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {heroPills.map((pill) => (
                <li key={pill} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BadgeCheck className="size-4 text-primary" />
                  {pill}
                </li>
              ))}
            </ul>
          </div>

          {a ? (
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <Link
                to="/contas/$id"
                params={{ id: a.id }}
                className="surface-panel block overflow-hidden transition-colors hover:border-primary/45"
              >
                {a.images[0] ? (
                  <img
                    src={a.images[0].url}
                    alt={`Destaque da ${a.title}`}
                    width={a.images[0].width ?? 1024}
                    height={a.images[0].height ?? 640}
                    className="aspect-[16/10] w-full object-cover"
                  />
                ) : null}
                <div className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <StatusBadge status={a.status} />
                    <p className="mt-2 font-bold">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Nível {a.level} · {a.server} · {a.skins}+ skins
                    </p>
                  </div>
                  <PriceDisplay value={centsToEuros(a.priceCents)} />
                </div>
              </Link>

              {b || c ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {b ? (
                    <Link
                      to="/contas/$id"
                      params={{ id: b.id }}
                      className="surface-panel p-4 transition-colors hover:border-primary/45"
                    >
                      <p className="text-xs text-muted-foreground">{b.title}</p>
                      <PriceDisplay value={centsToEuros(b.priceCents)} size="sm" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {b.evolutionWeapons} armas evolutivas
                      </p>
                    </Link>
                  ) : null}
                  {c ? (
                    <Link
                      to="/contas/$id"
                      params={{ id: c.id }}
                      className="surface-panel p-4 transition-colors hover:border-primary/45"
                    >
                      <p className="text-xs text-muted-foreground">{c.title}</p>
                      <PriceDisplay value={centsToEuros(c.priceCents)} size="sm" />
                      <p className="mt-1 text-xs text-muted-foreground">{c.emotes}+ emotes raros</p>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* Destaques */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-extrabold">Contas em destaque</h2>
            <p className="mt-2 text-muted-foreground">
              Uma seleção das contas mais procuradas do catálogo.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/contas">
              Ver todas <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        {featuredAccounts.length ? (
          <AccountGrid accounts={featuredAccounts} />
        ) : (
          <p className="text-muted-foreground">Novas contas em breve.</p>
        )}
      </section>

      {/* Como funciona */}
      <section className="border-y border-border bg-surface/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="font-display text-3xl font-extrabold">Como funciona</h2>
          <p className="mt-2 text-muted-foreground">Quatro passos simples até à sua conta.</p>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li key={step.title} className="surface-panel p-6">
                <span className="gold-text font-display text-3xl font-extrabold">0{i + 1}</span>
                <step.icon className="mt-4 size-5 text-primary" />
                <h3 className="mt-3 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Confiança */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((item) => (
            <div
              key={item.title}
              className="surface-panel p-6 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-bold">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="surface-panel ember-bg flex flex-col items-center gap-6 px-6 py-14 text-center">
          <h2 className="font-display max-w-2xl text-3xl font-extrabold sm:text-4xl">
            Pronto para encontrar a sua conta?
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Veja o catálogo completo com filtros por preço, level, servidor e características.
          </p>
          <Button asChild size="lg">
            <Link to="/contas">
              Explorar catálogo <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </StoreLayout>
  );
}
