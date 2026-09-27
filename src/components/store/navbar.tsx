import * as React from "react";
import { Link } from "@tanstack/react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, Menu, ShoppingBag, User, LifeBuoy, X } from "lucide-react";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { initialsOf, useSession } from "@/lib/session";
import { cn } from "@/lib/format";

const links = [
  { to: "/", label: "Início" },
  { to: "/contas", label: "Contas" },
  { to: "/como-funciona", label: "Como funciona" },
  { to: "/suporte", label: "Suporte" },
];

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { user, signOut } = useSession();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-border/70 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface/70 py-1.5 pr-4 pl-1.5 text-sm font-medium transition-colors hover:border-primary/40">
                <span className="gold-surface flex size-7 items-center justify-center rounded-full text-xs font-bold">
                  {initialsOf(user.name)}
                </span>
                {user.name.split(" ")[0]}
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="surface-panel z-50 w-52 p-1.5 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
                >
                  <DropdownItem to="/dashboard/perfil" icon={<User className="size-4" />}>
                    Minha conta
                  </DropdownItem>
                  <DropdownItem to="/dashboard/compras" icon={<ShoppingBag className="size-4" />}>
                    Minhas compras
                  </DropdownItem>
                  <DropdownItem to="/suporte" icon={<LifeBuoy className="size-4" />}>
                    Suporte
                  </DropdownItem>
                  <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
                  <DropdownMenu.Item
                    onSelect={() => void signOut()}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none data-[highlighted]:bg-secondary data-[highlighted]:text-foreground"
                  >
                    <LogOut className="size-4" />
                    Sair
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Criar conta</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border md:hidden"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="animate-fade-in border-t border-border bg-background/95 px-4 pb-6 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col py-2">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="grid gap-2">
            {user ? (
              <>
                <Button asChild variant="secondary" size="lg">
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    Meu painel
                  </Link>
                </Button>
                <Button variant="ghost" size="lg" onClick={() => void signOut()}>
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="secondary" size="lg">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    Entrar
                  </Link>
                </Button>
                <Button asChild size="lg">
                  <Link to="/register" onClick={() => setMobileOpen(false)}>
                    Criar conta
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

function DropdownItem({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        to={to}
        className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none data-[highlighted]:bg-secondary data-[highlighted]:text-foreground"
      >
        {icon}
        {children}
      </Link>
    </DropdownMenu.Item>
  );
}
