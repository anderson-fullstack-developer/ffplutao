import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Criar conta | Plutão Shop" },
      { name: "description", content: "Crie a sua conta de cliente na Plutão Shop." },
      { property: "og:title", content: "Criar conta | Plutão Shop" },
      { property: "og:description", content: "Registo de cliente na Plutão Shop." },
    ],
  }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const { signIn } = useSession();
  const [loading, setLoading] = React.useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setTimeout(() => {
      signIn();
      navigate({ to: "/dashboard" });
    }, 900);
  };

  return (
    <div className="ember-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="surface-panel p-7">
          <h1 className="font-display text-2xl font-extrabold">Criar conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Leva menos de um minuto e é totalmente gratuito.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Nome" htmlFor="nome">
              <Input id="nome" placeholder="João Martins" required />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" placeholder="voce@example.test" required />
            </Field>
            <Field label="Senha" htmlFor="senha">
              <Input id="senha" type="password" placeholder="••••••••" required />
            </Field>
            <Field label="Confirmar senha" htmlFor="senha2">
              <Input id="senha2" type="password" placeholder="••••••••" required />
            </Field>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                required
                className="mt-0.5 size-4 accent-[oklch(0.82_0.165_78)]"
              />
              Li e concordo com os Termos e Política de Privacidade
            </label>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Criar conta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
