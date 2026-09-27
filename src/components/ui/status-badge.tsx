import { cn } from "@/lib/format";
import type { AccountStatus, OrderStatus } from "@/types";

const map: Record<string, { label: string; className: string }> = {
  disponivel: { label: "Disponível", className: "bg-success/15 text-success border-success/30" },
  reservada: { label: "Reservada", className: "bg-warning/15 text-warning border-warning/30" },
  vendida: { label: "Vendida", className: "bg-muted text-muted-foreground border-border" },
  pago: { label: "Pago", className: "bg-success/15 text-success border-success/30" },
  pendente: { label: "Pendente", className: "bg-warning/15 text-warning border-warning/30" },
  cancelado: {
    label: "Cancelado",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
  reembolsado: { label: "Reembolsado", className: "bg-muted text-muted-foreground border-border" },
  ativo: { label: "Ativo", className: "bg-success/15 text-success border-success/30" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: AccountStatus | OrderStatus | "ativo" | "inativo";
  className?: string;
}) {
  const item = map[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        item.className,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {item.label}
    </span>
  );
}
