import { cn } from "@/lib/format";

const success = "bg-success/15 text-success border-success/30";
const warning = "bg-warning/15 text-warning border-warning/30";
const muted = "bg-muted text-muted-foreground border-border";
const danger = "bg-destructive/15 text-destructive border-destructive/30";

const map: Record<string, { label: string; className: string }> = {
  // Estados reais (base de dados)
  AVAILABLE: { label: "Disponível", className: success },
  RESERVED: { label: "Reservada", className: warning },
  SOLD: { label: "Vendida", className: muted },
  DRAFT: { label: "Rascunho", className: muted },
  DISABLED: { label: "Desativada", className: danger },
  PENDING: { label: "Pendente", className: warning },
  PAID: { label: "Pago", className: success },
  CANCELLED: { label: "Cancelado", className: danger },
  FAILED: { label: "Falhado", className: danger },
  REFUNDED: { label: "Reembolsado", className: muted },
  OPEN: { label: "Aberto", className: warning },
  IN_PROGRESS: { label: "Em andamento", className: warning },
  CLOSED: { label: "Fechado", className: muted },
  USER: { label: "Cliente", className: muted },
  ADMIN: { label: "Admin", className: "bg-primary/15 text-primary border-primary/30" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
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
