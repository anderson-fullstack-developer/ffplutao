import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, LayoutGrid, ListChecks, ShoppingCart } from "lucide-react";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona | Plutão Shop" },
      {
        name: "description",
        content: "Veja como escolher, comprar e aceder à sua conta de Free Fire na Plutão Shop.",
      },
      { property: "og:title", content: "Como funciona | Plutão Shop" },
      { property: "og:description", content: "Da escolha da conta até ao acesso no dashboard." },
    ],
  }),
  component: ComoFunciona,
});

const steps = [
  {
    icon: LayoutGrid,
    title: "Escolha uma conta",
    text: "Explore o catálogo, use os filtros por preço, level, servidor e características e compare opções.",
  },
  {
    icon: ListChecks,
    title: "Confira os detalhes",
    text: "Cada anúncio mostra skins, level, região, armas evolutivas, emotes e passes antigos.",
  },
  {
    icon: ShoppingCart,
    title: "Realize a compra",
    text: "Um checkout simples e direto, com o resumo do pedido sempre visível.",
  },
  {
    icon: BadgeCheck,
    title: "Acesse sua compra",
    text: "Os dados da conta ficam disponíveis na sua área de cliente, protegidos até você revelar.",
  },
];

const faq = [
  {
    q: "Os dados da conta aparecem antes da compra?",
    a: "Não. Os dados privados só são exibidos na sua área de compras depois da confirmação.",
  },
  {
    q: "Posso falar com alguém antes de comprar?",
    a: "Sim. Em cada conta existe um botão para falar com o suporte.",
  },
  {
    q: "Que moeda é usada?",
    a: "Todos os preços são apresentados em euros (€).",
  },
];

function ComoFunciona() {
  return (
    <StoreLayout>
      <div className="ember-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Como funciona</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Do catálogo até ao acesso à conta, em quatro passos simples.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <ol className="grid gap-5 sm:grid-cols-2">
          {steps.map((step, i) => (
            <li key={step.title} className="surface-panel p-6">
              <span className="gold-text font-display text-3xl font-extrabold">0{i + 1}</span>
              <step.icon className="mt-4 size-5 text-primary" />
              <h2 className="mt-3 text-lg font-bold">{step.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>

        <h2 className="font-display mt-16 text-2xl font-extrabold">Perguntas frequentes</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {faq.map((item) => (
            <div key={item.q} className="surface-panel p-6">
              <h3 className="font-bold">{item.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/contas">Ver contas</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/suporte">Falar com suporte</Link>
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}
