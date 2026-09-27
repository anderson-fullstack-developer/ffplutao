import * as React from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { getCurrentUserFn, loginFn } from "@/functions/auth";
import { safeRedirectPath } from "@/lib/auth-schemas";
import { useRefreshSession } from "@/lib/session";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (context.user) {
      throw redirect({ href: homeFor(context.user.role, search.redirect) });
    }
  },
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

function homeFor(role: string | undefined, redirectTo: string | undefined) {
  if (redirectTo) return safeRedirectPath(redirectTo);
  return role === "ADMIN" ? "/admin" : "/dashboard";
}

function Login() {
  const search = Route.useSearch();
  const router = useRouter();
  const refreshSession = useRefreshSession();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const result = await loginFn({
        data: {
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        },
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      await refreshSession();
      // Admin vai direto para o painel; clientes para a área de cliente (ou de onde vieram).
      const me = await getCurrentUserFn();
      await router.navigate({ href: homeFor(me?.role, search.redirect) });
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
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

          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            {error ? <FormError message={error} /> : null}
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="o-seu@email.com"
                aria-invalid={Boolean(fieldErrors["email"])}
                required
              />
            </Field>
            <Field label="Senha" htmlFor="senha">
              <Input
                id="senha"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </Field>

            <div className="flex justify-end text-sm">
              <Link to="/suporte" className="text-primary hover:underline">
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link
              to="/register"
              search={search.redirect ? { redirect: search.redirect } : {}}
              className="font-semibold text-primary hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
