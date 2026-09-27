import * as React from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { ReceiptText, Search } from "lucide-react";
import { z } from "zod";
import { AdminShell, DataTable } from "@/components/admin/admin-shell";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/misc";
import { listAdminOrdersFn, refundOrderFn } from "@/functions/admin";
import type { AdminOrderRow, OrderStatus } from "@/lib/admin";
import { centsToEuros } from "@/lib/catalog";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";

const statusValues = ["PENDING", "PAID", "CANCELLED", "FAILED", "REFUNDED"] as const;

export const Route = createFileRoute("/admin/pedidos")({
  validateSearch: z.object({
    q: z.string().max(80).optional().catch(undefined),
    status: z.enum(statusValues).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listAdminOrdersFn({ data: deps }),
  head: () => ({
    meta: [{ title: "Pedidos | Plutão Shop" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPedidos,
});

function AdminPedidos() {
  const rows = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = React.useState(search.q ?? "");
  const [selected, setSelected] = React.useState<AdminOrderRow | null>(null);
  const [refunding, setRefunding] = React.useState(false);
  const router = useRouter();

  const refund = async (orderId: string) => {
    if (!window.confirm("Devolver o valor total deste pedido ao cliente?")) return;
    setRefunding(true);
    try {
      const result = await refundOrderFn({ data: { orderId } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Dinheiro devolvido ao cliente");
      setSelected(null);
      await router.invalidate();
    } catch {
      toast.error("Não foi possível devolver o dinheiro. Tente novamente.");
    } finally {
      setRefunding(false);
    }
  };

  React.useEffect(() => {
    const value = query.trim();
    if (value === (search.q ?? "")) return;
    const timer = setTimeout(
      () =>
        void navigate({ search: (prev) => ({ ...prev, q: value || undefined }), replace: true }),
      350,
    );
    return () => clearTimeout(timer);
  }, [query, search.q, navigate]);

  return (
    <AdminShell
      title="Pedidos"
      description={`${rows.length} ${rows.length === 1 ? "pedido" : "pedidos"}.`}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nº do pedido, cliente, email ou conta..."
            aria-label="Pesquisar pedidos"
            className="pl-9"
          />
        </div>
        <Select
          value={search.status ?? ""}
          onChange={(e) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                status: (e.target.value || undefined) as OrderStatus | undefined,
              }),
            })
          }
          aria-label="Filtrar por estado"
          className="sm:w-52"
        >
          <option value="">Todos os estados</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="CANCELLED">Cancelado</option>
          <option value="FAILED">Falhado</option>
          <option value="REFUNDED">Reembolsado</option>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="size-6" />}
          title="Ainda não há pedidos."
          description="Os pedidos aparecem aqui assim que os clientes começarem a comprar."
        />
      ) : (
        <DataTable headers={["Pedido", "Cliente", "Conta", "Valor", "Estado", "Data", "Ações"]}>
          {rows.map((order) => (
            <tr key={order.id} className="transition-colors hover:bg-surface-2/30">
              <td className="px-4 py-3 font-semibold">{order.reference}</td>
              <td className="px-4 py-3">
                <p>{order.customerName}</p>
                <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
              </td>
              <td className="px-4 py-3">{order.accountTitle}</td>
              <td className="px-4 py-3 font-semibold">
                {formatPrice(centsToEuros(order.amountCents))}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
              <td className="px-4 py-3">
                <Button size="sm" variant="outline" onClick={() => setSelected(order)}>
                  Ver
                </Button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected ? `Pedido ${selected.reference}` : ""}
        description={selected ? `${selected.customerName} · ${selected.customerEmail}` : undefined}
      >
        {selected ? (
          <dl className="space-y-2 text-sm">
            <Row label="Estado" value={<StatusBadge status={selected.status} />} />
            <Row
              label="Conta"
              value={
                <Link
                  to="/admin/contas/$id/editar"
                  params={{ id: selected.accountId }}
                  className="text-primary hover:underline"
                >
                  {selected.accountTitle}
                </Link>
              }
            />
            <Row label="Valor" value={formatPrice(centsToEuros(selected.amountCents))} />
            <Row label="Criado" value={formatDate(selected.createdAt)} />
            <Row label="Pagamento" value="Cartão" />
            <Row label="Pago" value={selected.paidAt ? formatDate(selected.paidAt) : "—"} />
            {selected.status === "PAID" ? (
              <Row
                label="Dados vistos pelo cliente"
                value={
                  selected.credentialViews
                    ? `${selected.credentialViews}× · última ${formatDateTime(selected.lastCredentialViewAt!)}`
                    : "Ainda não"
                }
              />
            ) : null}
            {selected.refundedAt ? (
              <Row label="Devolvido" value={formatDate(selected.refundedAt)} />
            ) : null}
          </dl>
        ) : null}
        {selected ? (
          <div
            className={
              selected.status === "FAILED"
                ? "mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
                : "mt-4 rounded-lg border border-border bg-surface/50 p-3 text-sm text-muted-foreground"
            }
          >
            <p>{STATUS_HELP[selected.status]}</p>
            {selected.canRefund ? (
              <Button
                className="mt-3"
                variant="destructive"
                disabled={refunding}
                onClick={() => void refund(selected.id)}
              >
                {refunding ? "A devolver..." : "Devolver o dinheiro ao cliente"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}

const STATUS_HELP: Record<OrderStatus, string> = {
  PENDING:
    "O cliente está na página de pagamento. Se não pagar em 30 minutos, o pedido é cancelado sozinho e a conta volta à loja.",
  PAID: "Pago. O cliente já tem acesso aos dados da conta na área de cliente.",
  CANCELLED: "O cliente não concluiu o pagamento. Nada foi cobrado.",
  FAILED:
    "O cliente pagou, mas a conta já tinha sido vendida a outra pessoa, e a devolução automática não funcionou. Devolva o dinheiro ao cliente.",
  REFUNDED: "O dinheiro foi devolvido ao cartão do cliente (pode demorar alguns dias a aparecer).",
};

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/70 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : "font-semibold"}>{value}</dd>
    </div>
  );
}
