import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CreditCard,
  HelpCircle,
  Loader2,
  LogIn,
  MessagesSquare,
  ShoppingBag,
  User,
  Wallet,
} from "lucide-react";
import { z } from "zod";
import { StoreLayout } from "@/components/store/store-layout";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { FieldError, FormError } from "@/components/ui/form-error";
import { createTicketFn, listSupportOrderOptionsFn } from "@/functions/support";
import { SUPPORT_TOPICS } from "@/lib/support";
import { cn } from "@/lib/format";

export const Route = createFileRoute("/suporte")({
  validateSearch: z.object({ pedido: z.string().uuid().optional().catch(undefined) }),
  loader: async ({ context }) => ({
    orders: context.user ? await listSupportOrderOptionsFn() : [],
  }),
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

const topicIcons = [ShoppingBag, HelpCircle, CreditCard, User, Wallet];

function Suporte() {
  const { orders } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [topic, setTopic] = React.useState<string>(
    search.pedido ? SUPPORT_TOPICS[0] : (SUPPORT_TOPICS[0] ?? ""),
  );
  const [orderId, setOrderId] = React.useState<string>(
    search.pedido && orders.some((o) => o.id === search.pedido) ? search.pedido : "",
  );
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await createTicketFn({
        data: {
          topic: topic as (typeof SUPPORT_TOPICS)[number],
          orderId: orderId || null,
          message,
        },
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success("Mensagem enviada", {
        description: "Vai receber a resposta aqui, na sua área de cliente.",
      });
      await navigate({ to: "/dashboard/suporte/$id", params: { id: result.data.id } });
    } catch {
      setError("Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
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
          {SUPPORT_TOPICS.map((label, index) => {
            const Icon = topicIcons[index] ?? HelpCircle;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setTopic(label)}
                className={cn(
                  "surface-panel cursor-pointer p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40",
                  topic === label && "border-primary/60 bg-primary/5",
                )}
              >
                <Icon className="size-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">{label}</p>
              </button>
            );
          })}
        </div>

        {user ? (
          <form
            onSubmit={submit}
            className="surface-panel mt-10 max-w-2xl space-y-4 p-6"
            noValidate
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold">Enviar mensagem</h2>
              <Link
                to="/dashboard/suporte"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <MessagesSquare className="size-4" /> Os meus tickets
              </Link>
            </div>
            {error ? <FormError message={error} /> : null}
            <p className="text-sm text-muted-foreground">
              A enviar como <span className="font-semibold text-foreground">{user.email}</span>
            </p>
            <Field label="Assunto" htmlFor="s-assunto">
              <Select id="s-assunto" value={topic} onChange={(e) => setTopic(e.target.value)}>
                {SUPPORT_TOPICS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
              <FieldError message={fieldErrors["topic"]} />
            </Field>
            <Field label="Pedido relacionado" htmlFor="s-pedido">
              <Select id="s-pedido" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                <option value="">Nenhum</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.reference} — {order.accountTitle}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors["orderId"]} />
            </Field>
            <Field label="Mensagem" htmlFor="s-msg">
              <Textarea
                id="s-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva a sua questão..."
                maxLength={5000}
              />
              <FieldError message={fieldErrors["message"]} />
            </Field>
            <Button type="submit" size="lg" disabled={sending}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : "Enviar mensagem"}
            </Button>
          </form>
        ) : (
          <div className="surface-panel mt-10 max-w-2xl p-6">
            <h2 className="font-bold">Entre para falar connosco</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Para podermos ver os seus pedidos e responder-lhe em segurança, as mensagens são
              enviadas a partir da sua conta.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/login" search={{ redirect: "/suporte" }}>
                  <LogIn className="size-4" /> Entrar
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/register" search={{ redirect: "/suporte" }}>
                  Criar conta
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
