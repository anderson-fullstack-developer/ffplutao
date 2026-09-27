import * as React from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import {
  AlertTriangle,
  Eye,
  ImageOff,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { z } from "zod";
import { AdminShell, DataTable } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/misc";
import { deleteAccountFn, listAdminAccountsFn } from "@/functions/admin";
import type { AdminAccountRow } from "@/lib/admin";
import { centsToEuros } from "@/lib/catalog";
import { cn, formatDate, formatPrice } from "@/lib/format";

const statusValues = ["DRAFT", "AVAILABLE", "RESERVED", "SOLD", "DISABLED"] as const;

export const Route = createFileRoute("/admin/contas/")({
  validateSearch: z.object({
    q: z.string().max(80).optional().catch(undefined),
    status: z.enum(statusValues).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listAdminAccountsFn({ data: deps }),
  head: () => ({
    meta: [{ title: "Gerir contas | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminContas,
});

const filters = [
  { value: undefined, label: "Todas" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "AVAILABLE", label: "Disponível" },
  { value: "RESERVED", label: "Reservada" },
  { value: "SOLD", label: "Vendida" },
  { value: "DISABLED", label: "Desativada" },
] as const;

function AdminContas() {
  const rows = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const routeNavigate = Route.useNavigate();
  const router = useRouter();
  const [query, setQuery] = React.useState(search.q ?? "");
  const [toDelete, setToDelete] = React.useState<AdminAccountRow | null>(null);

  React.useEffect(() => {
    const value = query.trim();
    if (value === (search.q ?? "")) return;
    const timer = setTimeout(
      () =>
        void routeNavigate({
          search: (prev) => ({ ...prev, q: value || undefined }),
          replace: true,
        }),
      350,
    );
    return () => clearTimeout(timer);
  }, [query, search.q, routeNavigate]);

  const remove = async (account: AdminAccountRow) => {
    try {
      const result = await deleteAccountFn({ data: { id: account.id } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Conta excluída");
      await router.invalidate();
    } catch {
      toast.error("Não foi possível excluir a conta.");
    }
  };

  return (
    <AdminShell
      title="Gerir contas"
      description={`${rows.length} ${rows.length === 1 ? "conta" : "contas"}.`}
      actions={
        <Button asChild>
          <Link to="/admin/contas/nova">
            <PlusCircle className="size-4" /> Adicionar conta
          </Link>
        </Button>
      }
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar contas..."
            aria-label="Pesquisar contas"
            className="pl-9"
          />
        </div>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto">
          {filters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() =>
                void routeNavigate({ search: (prev) => ({ ...prev, status: filter.value }) })
              }
              className={cn(
                "cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                search.status === filter.value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Search className="size-6" />}
          title="Nenhuma conta encontrada."
          description="Ajuste a pesquisa ou adicione uma conta nova."
          actionLabel="Adicionar conta"
          onAction={() => void navigate({ to: "/admin/contas/nova" })}
        />
      ) : (
        <DataTable
          headers={["Imagem", "Conta", "Level", "Servidor", "Preço", "Estado", "Criada", "Ações"]}
        >
          {rows.map((account) => (
            <tr key={account.id} className="transition-colors hover:bg-surface-2/30">
              <td className="px-4 py-3">
                {account.coverUrl ? (
                  <img
                    src={account.coverUrl.replace(
                      "/image/upload/",
                      "/image/upload/f_auto,q_auto,w_120/",
                    )}
                    alt=""
                    loading="lazy"
                    className="size-12 rounded-md object-cover"
                  />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-md bg-surface text-muted-foreground">
                    <ImageOff className="size-4" />
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <Link
                  to="/admin/contas/$id/editar"
                  params={{ id: account.id }}
                  className="font-semibold hover:text-primary"
                >
                  {account.title}
                </Link>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {account.featured ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Star className="size-3" /> Destaque
                    </span>
                  ) : null}
                  {!account.hasCredentials ? (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <AlertTriangle className="size-3" /> Sem credenciais
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{account.level}</td>
              <td className="px-4 py-3 text-muted-foreground">{account.server}</td>
              <td className="px-4 py-3 font-semibold">
                {formatPrice(centsToEuros(account.priceCents))}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={account.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(account.createdAt)}</td>
              <td className="px-4 py-3">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger
                    aria-label={`Ações para ${account.title}`}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={6}
                      className="surface-panel z-50 w-48 p-1.5"
                    >
                      {["AVAILABLE", "RESERVED", "SOLD"].includes(account.status) ? (
                        <MenuItem
                          onSelect={() =>
                            void navigate({ to: "/contas/$id", params: { id: account.id } })
                          }
                        >
                          <Eye className="size-4" /> Ver na loja
                        </MenuItem>
                      ) : null}
                      <MenuItem
                        onSelect={() =>
                          void navigate({
                            to: "/admin/contas/$id/editar",
                            params: { id: account.id },
                          })
                        }
                      >
                        <Pencil className="size-4" /> Editar
                      </MenuItem>
                      {account.ordersCount === 0 ? (
                        <MenuItem danger onSelect={() => setToDelete(account)}>
                          <Trash2 className="size-4" /> Excluir
                        </MenuItem>
                      ) : null}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <ConfirmModal
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title="Excluir conta?"
        description={`"${toDelete?.title ?? ""}" e as suas imagens serão apagadas. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          if (toDelete) void remove(toDelete);
        }}
      />
    </AdminShell>
  );
}

function MenuItem({
  children,
  onSelect,
  danger,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none",
        danger
          ? "text-destructive data-[highlighted]:bg-destructive/10"
          : "text-muted-foreground data-[highlighted]:bg-secondary data-[highlighted]:text-foreground",
      )}
    >
      {children}
    </DropdownMenu.Item>
  );
}
