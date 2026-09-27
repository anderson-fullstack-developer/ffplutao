import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  LayoutDashboard,
  MessagesSquare,
  Menu,
  Package,
  PlusCircle,
  Search,
  UserCog,
  ShoppingCart,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/store/logo";
import { Input } from "@/components/ui/field";
import { countAwaitingTicketsFn } from "@/functions/support";
import { cn } from "@/lib/format";
import { initialsOf, useSession } from "@/lib/session";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: "tickets";
}

const items: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/contas", label: "Contas", icon: Package },
  { to: "/admin/contas/nova", label: "Adicionar conta", icon: PlusCircle },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/tickets", label: "Tickets", icon: MessagesSquare, badge: "tickets" },
  { to: "/dashboard/perfil", label: "Minha conta", icon: UserCog },
];

/** Nº de tickets à espera de resposta (atualiza a cada minuto). */
function useAwaitingTickets() {
  const { data } = useQuery({
    queryKey: ["admin-tickets-awaiting"],
    queryFn: () => countAwaitingTicketsFn(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  return data ?? 0;
}

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const { user } = useSession();
  const navigate = useNavigate();
  const awaiting = useAwaitingTickets();

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface/40 lg:flex lg:flex-col">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <SidebarNav />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            aria-label="Abrir menu admin"
            onClick={() => setOpen(true)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <form
            className="relative hidden max-w-sm flex-1 sm:block"
            onSubmit={(e) => {
              e.preventDefault();
              const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
              void navigate({ to: "/admin/contas", search: q ? { q } : {} });
            }}
          >
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Pesquisar contas... (Enter)"
              aria-label="Pesquisar contas"
              className="pl-9"
            />
          </form>
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/admin/tickets"
              aria-label={
                awaiting ? `${awaiting} tickets por responder` : "Sem tickets por responder"
              }
              title={awaiting ? `${awaiting} tickets por responder` : "Sem tickets por responder"}
              className="relative flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="size-4" />
              {awaiting ? (
                <span className="gold-surface absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold">
                  {awaiting > 99 ? "99+" : awaiting}
                </span>
              ) : null}
            </Link>
            <span
              title={user?.name}
              className="gold-surface flex size-9 items-center justify-center rounded-full text-xs font-bold"
            >
              {user ? initialsOf(user.name) : "AD"}
            </span>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
              {description ? (
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-border bg-background">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="cursor-pointer text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useSession();
  const awaiting = useAwaitingTickets();
  return (
    <nav className="space-y-1 p-3">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.exact ?? false }}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            "data-[status=active]:bg-primary/10 data-[status=active]:text-primary",
          )}
        >
          <item.icon className="size-4" />
          {item.label}
          {item.badge === "tickets" && awaiting > 0 ? (
            <span className="gold-surface ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold">
              {awaiting}
            </span>
          ) : null}
        </Link>
      ))}
      <Link
        to="/"
        onClick={onNavigate}
        className="mt-4 block rounded-lg border border-border px-3 py-2.5 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Voltar à loja
      </Link>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          void signOut();
        }}
        className="block w-full cursor-pointer rounded-lg px-3 py-2.5 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Sair
      </button>
    </nav>
  );
}

export function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="surface-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface-2/40 text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">{children}</tbody>
        </table>
      </div>
    </div>
  );
}
