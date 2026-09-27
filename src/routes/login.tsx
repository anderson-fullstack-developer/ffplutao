import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar | Plutão Shop" },
      { name: "description", content: "Aceda à sua área de cliente da Plutão Shop." },
      { property: "og:title", content: "Entrar | Plutão Shop" },
      { property: "og:description", content: "Área de cliente da Plutão Shop." },
    ],
  }),
  component: Login,
});

function Login() {
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
          <h1 className="font-display text-2xl font-extrabold">Bem-vindo de volta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre para ver as suas compras e dados de acesso.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" placeholder="voce@example.test" required />
            </Field>
            <Field label="Senha" htmlFor="senha">
              <Input id="senha" type="password" placeholder="••••••••" required />
            </Field>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="size-4 accent-[oklch(0.82_0.165_78)]" />
                Lembrar-me
              </label>
              <Link to="/suporte" className="text-primary hover:underline">
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" size="lg" className="w-full" onClick={submit}>
            Continuar com Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
