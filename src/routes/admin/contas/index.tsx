import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import { Eye, MoreHorizontal, Pencil, PlusCircle, Search, Trash2 } from "lucide-react";
import { AdminShell, DataTable } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { accounts } from "@/mock/accounts";
import { cn, formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/contas/")({
  head: () => ({
    meta: [
      { title: "Gerenciar contas | Plutão Shop" },
      { name: "description", content: "Gestão do catálogo de contas da Plutão Shop." },
      { property: "og:title", content: "Gerenciar contas | Plutão Shop" },
      { property: "og:description", content: "Adicione, edite e publique contas." },
    ],
  }),
  component: AdminContas,
});

const filters = [
  { value: "todos", label: "Todos" },
  { value: "disponivel", label: "Disponível" },
  { value: "reservada", label: "Reservada" },
  { value: "vendida", label: "Vendida" },
];

function AdminContas() {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("todos");
  const [toDelete, setToDelete] = React.useState<string | null>(null);

  const rows = accounts.filter(
    (account) =>
      (status === "todos" || account.status === status) &&
      account.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AdminShell
      title="Gerenciar contas"
      description={`${rows.length} contas no catálogo.`}
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
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={cn(
                "cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                status === filter.value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        headers={["Imagem", "Conta", "Level", "Servidor", "Preço", "Status", "Data", "Ações"]}
      >
        {rows.map((account) => (
          <tr key={account.id} className="transition-colors hover:bg-surface-2/30">
            <td className="px-4 py-3">
              <img
                src={account.images[0]}
                alt={account.title}
                loading="lazy"
                width={1024}
                height={640}
                className="size-12 rounded-md object-cover"
              />
            </td>
            <td className="px-4 py-3 font-semibold">{account.title}</td>
            <td className="px-4 py-3 text-muted-foreground">{account.level}</td>
            <td className="px-4 py-3 text-muted-foreground">{account.server}</td>
            <td className="px-4 py-3 font-semibold">{formatPrice(account.price)}</td>
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
                    className="surface-panel z-50 w-44 p-1.5"
                  >
                    <DropdownMenu.Item
                      onSelect={() => navigate({ to: "/contas/$id", params: { id: account.id } })}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none data-[highlighted]:bg-secondary data-[highlighted]:text-foreground"
                    >
                      <Eye className="size-4" /> Visualizar
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() =>
                        navigate({ to: "/admin/contas/$id/editar", params: { id: account.id } })
                      }
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none data-[highlighted]:bg-secondary data-[highlighted]:text-foreground"
                    >
                      <Pencil className="size-4" /> Editar
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => setToDelete(account.id)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10"
                    >
                      <Trash2 className="size-4" /> Excluir
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </td>
          </tr>
        ))}
      </DataTable>

      <ConfirmModal
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title="Excluir conta?"
        description="Esta ação é apenas visual nesta versão de demonstração."
        confirmLabel="Excluir"
        onConfirm={() => {
          toast.success("Conta excluída (simulado)");
          setToDelete(null);
        }}
      />
    </AdminShell>
  );
}
