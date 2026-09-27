import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/store/logo";
import { LEGAL } from "@/lib/legal";

const columns = [
  {
    title: "Loja",
    links: [
      { label: "Contas", to: "/contas" },
      { label: "Carrinho", to: "/carrinho" },
      { label: "Como funciona", to: "/como-funciona" },
    ],
  },
  {
    title: "Ajuda",
    links: [
      { label: "Perguntas frequentes", to: "/faq" },
      { label: "Suporte", to: "/suporte" },
      { label: "Minhas compras", to: "/dashboard/compras" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Termos e Condições", to: "/termos" },
      { label: "Privacidade", to: "/privacidade" },
      { label: "Reembolsos", to: "/reembolsos" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/30">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            A sua loja digital para encontrar contas de Free Fire selecionadas.
          </p>
          <a
            href={LEGAL.complaintsBookUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            Livro de Reclamações
          </a>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h4 className="text-sm font-bold tracking-wide uppercase">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Plutão Shop é uma loja independente e não é afiliada, patrocinada ou administrada pela
            Garena.
          </p>
          <p>© 2026 Plutão Shop. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
