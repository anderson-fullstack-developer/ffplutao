import * as React from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import * as Tabs from "@radix-ui/react-tabs";
import {
  CalendarDays,
  Gamepad2,
  Globe2,
  Headphones,
  Info,
  LayoutDashboard,
  ShieldCheck,
  Smile,
  Sparkles,
  Swords,
  Ticket,
  Users,
  X,
  Zap,
} from "lucide-react";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriceDisplay } from "@/components/ui/misc";
import { getAccount } from "@/mock/accounts";

export const Route = createFileRoute("/contas/$id")({
  loader: ({ params }) => {
    const account = getAccount(params.id);
    if (!account) throw notFound();
    return { account };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.account.title ?? "Conta"} | Plutão Shop` },
      {
        name: "description",
        content: `Detalhes da ${loaderData?.account.title}: level, servidor, skins, armas evolutivas e emotes.`,
      },
      { property: "og:title", content: `${loaderData?.account.title ?? "Conta"} | Plutão Shop` },
      {
        property: "og:description",
        content: "Veja todos os detalhes desta conta antes de comprar.",
      },
    ],
  }),
  component: AccountDetail,
});

function AccountDetail() {
  const { account } = Route.useLoaderData();
  const [active, setActive] = React.useState(0);
  const [lightbox, setLightbox] = React.useState(false);

  const items = [
    { icon: Swords, label: "Armas evolutivas", value: String(account.evolutionWeapons) },
    { icon: Sparkles, label: "Skins", value: `${account.skins}+` },
    { icon: Smile, label: "Emotes", value: `${account.emotes}+` },
    { icon: Users, label: "Personagens", value: String(account.characters) },
    { icon: Ticket, label: "Passes antigos", value: String(account.passes) },
    { icon: Gamepad2, label: "Nível", value: String(account.level) },
  ];

  const info = [
    { icon: Gamepad2, label: "Level", value: String(account.level) },
    { icon: Globe2, label: "Servidor", value: account.server },
    { icon: CalendarDays, label: "Conta criada em", value: String(account.year) },
    { icon: Sparkles, label: "Skins", value: `${account.skins}+` },
    { icon: Swords, label: "Armas evolutivas", value: String(account.evolutionWeapons) },
    { icon: Smile, label: "Emotes raros", value: `${account.emotes}+` },
    { icon: Ticket, label: "Passes antigos", value: String(account.passes) },
  ];

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Início
          </Link>{" "}
          /{" "}
          <Link to="/contas" className="hover:text-primary">
            Contas
          </Link>{" "}
          / <span className="text-foreground">{account.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
          {/* Galeria */}
          <div>
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="surface-panel block w-full cursor-zoom-in overflow-hidden"
            >
              <img
                src={account.images[active]}
                alt={`Screenshot ${active + 1} da ${account.title}`}
                width={1024}
                height={640}
                className="aspect-[16/10] w-full object-cover"
              />
            </button>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {account.images.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Ver screenshot ${index + 1}`}
                  className={`overflow-hidden rounded-lg border transition-all ${
                    index === active
                      ? "border-primary opacity-100"
                      : "border-border opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={image}
                    alt={`Miniatura ${index + 1} da ${account.title}`}
                    loading="lazy"
                    width={1024}
                    height={640}
                    className="aspect-[16/10] w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <StatusBadge status={account.status} />
            <h1 className="font-display mt-4 text-3xl font-extrabold sm:text-4xl">
              {account.title}
            </h1>
            <div className="surface-panel mt-6 flex items-end justify-between gap-4 p-5">
              <div>
                <p className="text-xs text-muted-foreground">Preço final</p>
                <PriceDisplay value={account.price} size="lg" />
              </div>
              <p className="text-right text-xs text-muted-foreground">
                Pagamento único
                <br />
                sem subscrições
              </p>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              {info.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 px-3 py-2.5"
                >
                  <item.icon className="size-4 text-primary" />
                  <div>
                    <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
                    <dd className="text-sm font-semibold">{item.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Button asChild size="lg" className="sm:col-span-2">
                <Link to="/checkout/$id" params={{ id: account.id }}>
                  Comprar agora
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="sm:col-span-2">
                <Link to="/suporte">
                  <Headphones className="size-4" /> Falar com suporte
                </Link>
              </Button>
            </div>

            <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Compra simples
              </li>
              <li className="flex items-center gap-2">
                <Zap className="size-4 text-primary" /> Entrega digital
              </li>
              <li className="flex items-center gap-2">
                <LayoutDashboard className="size-4 text-primary" /> Acesso pelo dashboard
              </li>
            </ul>

            <div className="mt-6 flex gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                Os dados privados da conta adquirida são exibidos apenas na área de compras do
                utilizador após a confirmação da compra.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs.Root defaultValue="visao" className="mt-14">
          <Tabs.List className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-border">
            {(
              [
                ["visao", "Visão geral"],
                ["itens", "Itens"],
                ["info", "Informações"],
                ["desc", "Descrição"],
              ] as const
            ).map(([value, label]) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="-mb-px cursor-pointer border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="visao" className="pt-6">
            <p className="max-w-3xl text-muted-foreground">{account.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {account.highlights.map((h) => (
                <span
                  key={h}
                  className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs font-semibold"
                >
                  {h}
                </span>
              ))}
            </div>
          </Tabs.Content>

          <Tabs.Content value="itens" className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div key={item.label} className="surface-panel flex items-center gap-4 p-5">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="font-display text-xl font-extrabold">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Tabs.Content>

          <Tabs.Content value="info" className="pt-6">
            <dl className="surface-panel divide-y divide-border/70">
              {info.map((item) => (
                <div key={item.label} className="flex justify-between gap-4 px-5 py-3.5 text-sm">
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="font-semibold">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Tabs.Content>

          <Tabs.Content value="desc" className="pt-6">
            <p className="max-w-3xl text-muted-foreground">
              {account.description} Todos os itens listados foram confirmados no momento da
              publicação do anúncio.
            </p>
          </Tabs.Content>
        </Tabs.Root>
      </div>

      {lightbox ? (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="Fechar imagem"
            className="absolute top-5 right-5 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-6" />
          </button>
          <img
            src={account.images[active]}
            alt={`Screenshot ampliada da ${account.title}`}
            className="max-h-[85vh] w-auto rounded-xl"
          />
        </div>
      ) : null}
    </StoreLayout>
  );
}
