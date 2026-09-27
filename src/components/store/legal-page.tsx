import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { StoreLayout } from "@/components/store/store-layout";
import { LEGAL } from "@/lib/legal";

const pages = [
  { to: "/termos", label: "Termos e Condições" },
  { to: "/privacidade", label: "Privacidade" },
  { to: "/reembolsos", label: "Reembolsos" },
  { to: "/faq", label: "Perguntas frequentes" },
] as const;

/** Layout comum das páginas legais e de ajuda (texto longo, fácil de ler). */
export function LegalPage({
  title,
  intro,
  children,
  updated = true,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  updated?: boolean;
}) {
  return (
    <StoreLayout>
      <div className="ember-bg border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
          {intro ? <p className="mt-3 max-w-2xl text-muted-foreground">{intro}</p> : null}
          {updated ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Última atualização: {LEGAL.lastUpdated}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mx-auto grid max-w-4xl gap-10 px-4 py-12 sm:px-6 lg:max-w-6xl lg:grid-cols-[1fr_220px]">
        <article className="legal-prose space-y-8 text-sm leading-relaxed text-muted-foreground">
          {children}
        </article>
        <nav aria-label="Outras páginas" className="h-fit lg:sticky lg:top-32">
          <p className="mb-3 text-xs font-semibold tracking-wide uppercase">Informação</p>
          <ul className="space-y-2 text-sm">
            {pages.map((page) => (
              <li key={page.to}>
                <Link
                  to={page.to}
                  className="text-muted-foreground hover:text-primary data-[status=active]:font-semibold data-[status=active]:text-primary"
                >
                  {page.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/suporte" className="text-muted-foreground hover:text-primary">
                Falar com o suporte
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </StoreLayout>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
