import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, LayoutGrid, ListChecks, ShoppingCart } from "lucide-react";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { FAQ } from "@/lib/faq";

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
    text: "Explore o catálogo e filtre por preço, nível, servidor e características. Pode comprar uma conta ou juntar várias no carrinho.",
  },
  {
    icon: ListChecks,
    title: "Confira os detalhes",
    text: "Cada anúncio mostra screenshots, nível, servidor, skins, armas evolutivas, emotes e passes antigos.",
  },
  {
    icon: ShoppingCart,
    title: "Pague em segurança",
    text: "Cartão, Apple Pay ou Google Pay numa página de pagamento segura. As contas ficam reservadas para si durante o pagamento.",
  },
  {
    icon: BadgeCheck,
    title: "Receba os dados na hora",
    text: 'Logo após a confirmação, abra "Minhas compras" e carregue em "Revelar dados" para ver o login e a senha da conta.',
  },
];

const faq = FAQ.flatMap((group) => group.items).slice(0, 6);

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
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <Link to="/faq">Todas as perguntas</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link to="/suporte">Falar com o suporte</Link>
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}
