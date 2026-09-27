import * as React from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FieldError, FormError } from "@/components/ui/form-error";
import { registerFn } from "@/functions/auth";
import { safeRedirectPath } from "@/lib/auth-schemas";
import { useRefreshSession } from "@/lib/session";

export const Route = createFileRoute("/register")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (context.user) {
      throw redirect({ href: safeRedirectPath(search.redirect) });
    }
  },
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
      const result = await registerFn({
        data: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          confirmPassword: String(form.get("confirmPassword") ?? ""),
          acceptTerms: form.get("acceptTerms") === "on",
        },
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      await refreshSession();
      await router.navigate({ href: safeRedirectPath(search.redirect) });
    } catch {
      setError("Não foi possível criar a conta. Tente novamente.");
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
          <h1 className="font-display text-2xl font-extrabold">Criar conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Leva menos de um minuto e é totalmente gratuito.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            {error ? <FormError message={error} /> : null}
            <Field label="Nome" htmlFor="nome">
              <Input
                id="nome"
                name="name"
                autoComplete="name"
                placeholder="João Martins"
                required
              />
              <FieldError message={fieldErrors["name"]} />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@example.test"
                required
              />
              <FieldError message={fieldErrors["email"]} />
            </Field>
            <Field label="Senha" htmlFor="senha">
              <Input
                id="senha"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                required
              />
              <FieldError message={fieldErrors["password"]} />
            </Field>
            <Field label="Confirmar senha" htmlFor="senha2">
              <Input
                id="senha2"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                required
              />
              <FieldError message={fieldErrors["confirmPassword"]} />
            </Field>

            <div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  required
                  className="mt-0.5 size-4 accent-[oklch(0.82_0.165_78)]"
                />
                Li e concordo com os Termos e Política de Privacidade
              </label>
              <FieldError message={fieldErrors["acceptTerms"]} />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Criar conta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link
              to="/login"
              search={search.redirect ? { redirect: search.redirect } : {}}
              className="font-semibold text-primary hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
