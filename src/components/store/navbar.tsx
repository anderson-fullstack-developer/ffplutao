import * as React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ChevronDown,
  Headphones,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  User,
  X,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useCart } from "@/lib/cart";
import { initialsOf, useSession } from "@/lib/session";
import { cn } from "@/lib/format";

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none data-[highlighted]:bg-secondary data-[highlighted]:text-foreground";

const navLinkClass =
  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:text-primary";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { user, signOut } = useSession();
  const cart = useCart();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // Fecha o menu do telemóvel ao mudar de página.
  React.useEffect(() => setMobileOpen(false), [pathname]);

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    void navigate({ to: "/contas", search: q ? { q } : {} });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Faixa de confiança */}
      <div className="hidden h-8 border-b border-border/60 bg-surface/95 md:block">
        <ul className="mx-auto flex h-full max-w-7xl items-center justify-center gap-8 px-6 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" /> Pagamento 100% seguro
          </li>
          <li className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-primary" /> Entrega imediata na sua área de cliente
          </li>
          <li className="flex items-center gap-1.5">
            <Headphones className="size-3.5 text-primary" /> Suporte em português
          </li>
        </ul>
      </div>

      <div className="border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-6">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
            <AccountsMenu active={pathname.startsWith("/contas")} />
            <Link to="/como-funciona" className={navLinkClass}>
              Como funciona
            </Link>
            <Link to="/suporte" className={navLinkClass}>
              Ajuda
            </Link>
          </nav>

          <form
            onSubmit={search}
            className="relative hidden max-w-xs flex-1 md:block"
            role="search"
          >
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Pesquisar contas..."
              aria-label="Pesquisar contas"
              maxLength={80}
              className="h-10 pl-9"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <CartLink count={cart.count} />

            {user ? (
              <>
                <Button asChild variant="ghost" className="hidden xl:inline-flex">
                  <Link to="/dashboard/compras">
                    <ShoppingBag className="size-4" /> Minhas compras
                  </Link>
                </Button>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger className="hidden cursor-pointer items-center gap-2 rounded-full border border-border bg-surface/70 py-1.5 pr-3 pl-1.5 text-sm font-medium transition-colors hover:border-primary/40 sm:flex">
                    <span className="gold-surface flex size-7 items-center justify-center rounded-full text-xs font-bold">
                      {initialsOf(user.name)}
                    </span>
                    <span className="max-w-28 truncate">{user.name.split(" ")[0]}</span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={8}
                      className="surface-panel z-50 w-56 p-1.5 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
                    >
                      <div className="px-3 py-2">
                        <p className="truncate text-sm font-semibold">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
                      <MenuLink to="/dashboard/compras" icon={<ShoppingBag className="size-4" />}>
                        Minhas compras
                      </MenuLink>
                      <MenuLink to="/dashboard/perfil" icon={<User className="size-4" />}>
                        Minha conta
                      </MenuLink>
                      <MenuLink to="/dashboard/suporte" icon={<LifeBuoy className="size-4" />}>
                        Ajuda e mensagens
                      </MenuLink>
                      <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
                      <DropdownMenu.Item onSelect={() => void signOut()} className={itemClass}>
                        <LogOut className="size-4" />
                        Sair
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Button asChild variant="ghost">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Criar conta</Link>
                </Button>
              </div>
            )}

            <button
              type="button"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border lg:hidden"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="animate-fade-in max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-background/95 px-4 pb-6 backdrop-blur-xl lg:hidden">
          <form onSubmit={search} className="relative pt-4 md:hidden" role="search">
            <Search className="absolute top-1/2 left-3 mt-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Pesquisar contas..."
              aria-label="Pesquisar contas"
              className="pl-9"
            />
          </form>
          <nav className="flex flex-col py-2" aria-label="Menu">
            <MobileLink to="/contas">Todas as contas</MobileLink>
            <div className="flex flex-wrap gap-2 px-3 pb-3">
              {QUICK_FILTERS.map((filter) => (
                <Link
                  key={filter.label}
                  to="/contas"
                  search={filter.search}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  {filter.label}
                </Link>
              ))}
            </div>
            <MobileLink to="/como-funciona">Como funciona</MobileLink>
            <MobileLink to="/suporte">Ajuda</MobileLink>
            <MobileLink to="/carrinho">Carrinho{cart.count ? ` (${cart.count})` : ""}</MobileLink>
            {user ? (
              <>
                <MobileLink to="/dashboard/compras">Minhas compras</MobileLink>
                <MobileLink to="/dashboard/perfil">Minha conta</MobileLink>
              </>
            ) : null}
          </nav>
          <div className="grid gap-2">
            {user ? (
              <Button variant="ghost" size="lg" onClick={() => void signOut()}>
                <LogOut className="size-4" /> Sair
              </Button>
            ) : (
              <>
                <Button asChild variant="secondary" size="lg">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild size="lg">
                  <Link to="/register">Criar conta</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

const QUICK_FILTERS = [
  { label: "Até €25", search: { preco: "0-25" as const } },
  { label: "€25 – €50", search: { preco: "25-50" as const } },
  { label: "€50 – €100", search: { preco: "50-100" as const } },
  { label: "Mais de €100", search: { preco: "100+" as const } },
  { label: "Brasil", search: { servidor: ["Brasil" as const] } },
  { label: "Europa", search: { servidor: ["Europa" as const] } },
  { label: "América Latina", search: { servidor: ["América Latina" as const] } },
];

function AccountsMenu({ active }: { active: boolean }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        Contas <ChevronDown className="size-3.5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="surface-panel z-50 grid w-[26rem] grid-cols-2 gap-1 p-2 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item asChild>
            <Link
              to="/contas"
              className="col-span-2 flex cursor-pointer items-center justify-between rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary outline-none data-[highlighted]:bg-primary/15"
            >
              Ver todas as contas <span aria-hidden>→</span>
            </Link>
          </DropdownMenu.Item>
          <div>
            <DropdownMenu.Label className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Por preço
            </DropdownMenu.Label>
            {QUICK_FILTERS.slice(0, 4).map((filter) => (
              <DropdownMenu.Item key={filter.label} asChild>
                <Link to="/contas" search={filter.search} className={itemClass}>
                  {filter.label}
                </Link>
              </DropdownMenu.Item>
            ))}
          </div>
          <div>
            <DropdownMenu.Label className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Por servidor
            </DropdownMenu.Label>
            {QUICK_FILTERS.slice(4).map((filter) => (
              <DropdownMenu.Item key={filter.label} asChild>
                <Link to="/contas" search={filter.search} className={itemClass}>
                  {filter.label}
                </Link>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Item asChild>
              <Link to="/contas" search={{ ordem: "nivel" }} className={itemClass}>
                Maior nível
              </Link>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function CartLink({ count }: { count: number }) {
  return (
    <Link
      to="/carrinho"
      aria-label={count ? `Carrinho (${count})` : "Carrinho"}
      className="relative flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground data-[status=active]:text-primary"
    >
      <ShoppingCart className="size-4" />
      {count ? (
        <span className="gold-surface absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function MenuLink({
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
      <Link to={to} className={itemClass}>
        {icon}
        {children}
      </Link>
    </DropdownMenu.Item>
  );
}

function MobileLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-lg px-3 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground data-[status=active]:text-primary"
    >
      {children}
    </Link>
  );
}
