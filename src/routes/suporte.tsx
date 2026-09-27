import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CreditCard, HelpCircle, Loader2, ShoppingBag, User, Wallet } from "lucide-react";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { myOrders } from "@/mock/orders";
import { cn } from "@/lib/format";

export const Route = createFileRoute("/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte | Plutão Shop" },
      { name: "description", content: "Fale com a equipa de suporte da Plutão Shop." },
      { property: "og:title", content: "Suporte | Plutão Shop" },
      { property: "og:description", content: "Como podemos ajudar?" },
    ],
  }),
  component: Suporte,
});

const topics = [
  { icon: ShoppingBag, label: "Problemas com uma compra" },
  { icon: HelpCircle, label: "Dúvidas sobre uma conta" },
  { icon: CreditCard, label: "Pagamento" },
  { icon: User, label: "Minha conta" },
  { icon: Wallet, label: "Outro assunto" },
];

function Suporte() {
  const [topic, setTopic] = React.useState<string>(topics[0]?.label ?? "");
  const [sending, setSending] = React.useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Mensagem enviada", {
        description: "A nossa equipa responde normalmente em algumas horas.",
      });
    }, 1200);
  };

  return (
    <StoreLayout>
      <div className="ember-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Como podemos ajudar?</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Escolha um assunto e envie a sua mensagem. Respondemos o mais rápido possível.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {topics.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setTopic(item.label)}
              className={cn(
                "surface-panel cursor-pointer p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40",
                topic === item.label && "border-primary/60 bg-primary/5",
              )}
            >
              <item.icon className="size-5 text-primary" />
              <p className="mt-3 text-sm font-semibold">{item.label}</p>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="surface-panel mt-10 max-w-2xl space-y-4 p-6">
          <h2 className="font-bold">Enviar mensagem</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" htmlFor="s-nome">
              <Input id="s-nome" placeholder="O seu nome" required />
            </Field>
            <Field label="Email" htmlFor="s-email">
              <Input id="s-email" type="email" placeholder="voce@example.test" required />
            </Field>
          </div>
          <Field label="Assunto" htmlFor="s-assunto">
            <Select id="s-assunto" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {topics.map((t) => (
                <option key={t.label}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Pedido relacionado" htmlFor="s-pedido">
            <Select id="s-pedido">
              <option value="">Nenhum</option>
              {myOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.reference} — {order.accountTitle}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mensagem" htmlFor="s-msg">
            <Textarea id="s-msg" placeholder="Descreva a sua questão..." required />
          </Field>
          <Button type="submit" size="lg" disabled={sending}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : "Enviar mensagem"}
          </Button>
        </form>
      </div>
    </StoreLayout>
  );
}
