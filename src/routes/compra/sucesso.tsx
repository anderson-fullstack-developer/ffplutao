import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/compra/sucesso")({
  head: () => ({
    meta: [
      { title: "Compra concluída | Plutão Shop" },
      { name: "description", content: "A sua compra está disponível na área de cliente." },
      { property: "og:title", content: "Compra concluída | Plutão Shop" },
      { property: "og:description", content: "Pedido confirmado na Plutão Shop." },
    ],
  }),
  component: Sucesso,
});

function Sucesso() {
  return (
    <StoreLayout>
      <div className="ember-bg flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="surface-panel animate-scale-in w-full max-w-lg p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-9" />
          </div>
          <h1 className="font-display mt-6 text-3xl font-extrabold">Compra concluída!</h1>
          <p className="mt-2 text-muted-foreground">
            Sua compra está disponível na sua área de cliente.
          </p>

          <dl className="mt-8 space-y-2 rounded-xl border border-border bg-surface/50 p-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pedido</dt>
              <dd className="font-semibold">#PLU-2026-00128</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Valor</dt>
              <dd className="gold-text font-bold">{formatPrice(69.9)}</dd>
            </div>
          </dl>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg">
              <Link to="/dashboard/compras/$id" params={{ id: "plu-2026-00128" }}>
                Ver minha compra
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contas">Continuar comprando</Link>
            </Button>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
