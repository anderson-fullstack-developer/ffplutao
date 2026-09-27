import * as React from "react";
import { Link } from "@tanstack/react-router";
import { LayoutGrid, LifeBuoy, LogOut, Menu, ShoppingBag, User, X } from "lucide-react";
import { Navbar } from "@/components/store/navbar";
import { Footer } from "@/components/store/footer";
import { cn } from "@/lib/format";
import { useSession } from "@/lib/session";

const items = [
  { to: "/dashboard", label: "Visão geral", icon: LayoutGrid, exact: true },
  { to: "/dashboard/compras", label: "Minhas compras", icon: ShoppingBag },
  { to: "/dashboard/perfil", label: "Minha conta", icon: User },
  { to: "/suporte", label: "Suporte", icon: LifeBuoy },
];

export function DashboardShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const session = useSession();
  const signOut = () => void session.signOut();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="ember-bg flex-1 pt-16">
        <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:py-12">
          <aside className="hidden w-60 shrink-0 lg:block">
            <SidebarNav onSignOut={signOut} />
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
                {description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Abrir menu do painel"
                onClick={() => setOpen(true)}
                className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border lg:hidden"
              >
                <Menu className="size-5" />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
      <Footer />

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="animate-slide-in-right absolute inset-y-0 right-0 w-72 border-l border-border bg-background p-5">
            <div className="mb-6 flex items-center justify-between">
              <p className="font-display font-bold">Painel</p>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="cursor-pointer text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} onSignOut={signOut} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SidebarNav({ onNavigate, onSignOut }: { onNavigate?: () => void; onSignOut: () => void }) {
  return (
    <nav className="surface-panel space-y-1 p-2">
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
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          onSignOut();
        }}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="size-4" />
        Sair
      </button>
    </nav>
  );
}
