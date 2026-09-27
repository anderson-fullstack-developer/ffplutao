import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/store/logo";

const columns = [
  {
    title: "Loja",
    links: [
      { label: "Contas", to: "/contas" },
      { label: "Como funciona", to: "/como-funciona" },
    ],
  },
  {
    title: "Ajuda",
    links: [
      { label: "Suporte", to: "/suporte" },
      { label: "FAQ", to: "/suporte" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Termos", to: "/suporte" },
      { label: "Privacidade", to: "/suporte" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/30">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Sua loja digital para encontrar contas de Free Fire selecionadas.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
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
          </div>
        ))}
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Plutão Shop não é afiliada, patrocinada ou administrada pela Garena.</p>
          <p>© 2026 Plutão Shop. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
