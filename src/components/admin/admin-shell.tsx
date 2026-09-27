import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Package,
  PlusCircle,
  Search,
  Settings,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/store/logo";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/format";
import { initialsOf, useSession } from "@/lib/session";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/contas", label: "Contas", icon: Package },
  { to: "/admin/contas/nova", label: "Adicionar conta", icon: PlusCircle },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/suporte", label: "Suporte", icon: LifeBuoy },
  { to: "/dashboard/perfil", label: "Configurações", icon: Settings },
];

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
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Pesquisar..." aria-label="Pesquisar no painel" className="pl-9" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              aria-label="Notificações"
              className="relative flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="size-4" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-accent" />
            </button>
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
