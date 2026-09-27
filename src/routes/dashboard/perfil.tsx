import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FieldError } from "@/components/ui/form-error";
import { changePasswordFn, updateProfileFn } from "@/functions/auth";
import { formatDate } from "@/lib/format";
import { initialsOf, useRefreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/perfil")({
  head: () => ({
    meta: [
      { title: "Minha conta | Plutão Shop" },
      { name: "description", content: "Gira os dados da sua conta de cliente da Plutão Shop." },
      { property: "og:title", content: "Minha conta | Plutão Shop" },
      { property: "og:description", content: "Dados pessoais e senha da sua conta." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { user } = Route.useRouteContext();
  const refreshSession = useRefreshSession();

  const [name, setName] = React.useState(user.name);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [profileErrors, setProfileErrors] = React.useState<Record<string, string>>({});

  const [savingPassword, setSavingPassword] = React.useState(false);
  const [passwordErrors, setPasswordErrors] = React.useState<Record<string, string>>({});

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileErrors({});
    try {
      const result = await updateProfileFn({ data: { name } });
      if (!result.ok) {
        setProfileErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      await refreshSession();
      toast.success("Alterações guardadas");
    } catch {
      toast.error("Não foi possível guardar. Tente novamente.");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSavingPassword(true);
    setPasswordErrors({});
    try {
      const result = await changePasswordFn({
        data: {
          currentPassword: String(form.get("currentPassword") ?? ""),
          newPassword: String(form.get("newPassword") ?? ""),
          confirmPassword: String(form.get("confirmPassword") ?? ""),
        },
      });
      if (!result.ok) {
        setPasswordErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      formElement.reset();
      toast.success("Senha atualizada. As outras sessões foram terminadas.");
    } catch {
      toast.error("Não foi possível atualizar a senha. Tente novamente.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <DashboardShell title="Minha conta" description="Os seus dados pessoais e de acesso.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="surface-panel p-6">
          <div className="flex items-center gap-4">
            <span className="gold-surface flex size-14 items-center justify-center rounded-full text-lg font-bold">
              {initialsOf(user.name)}
            </span>
            <div>
              <p className="font-bold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cliente desde {formatDate(user.createdAt)}
              </p>
            </div>
          </div>

          <form onSubmit={save} className="mt-7 space-y-4" noValidate>
            <Field label="Nome" htmlFor="p-nome">
              <Input
                id="p-nome"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <FieldError message={profileErrors["name"]} />
            </Field>
            <Field label="Email" htmlFor="p-email">
              <Input id="p-email" type="email" value={user.email} readOnly disabled />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Para alterar o email, contacte o suporte.
              </p>
            </Field>
            <Button type="submit" disabled={savingProfile || name.trim() === user.name}>
              {savingProfile ? <Loader2 className="size-4 animate-spin" /> : "Salvar alterações"}
            </Button>
          </form>
        </section>

        <section className="surface-panel h-fit p-6">
          <h2 className="font-bold">Alterar senha</h2>
          <form onSubmit={changePassword} className="mt-5 space-y-4" noValidate>
            <Field label="Senha atual" htmlFor="p-atual">
              <Input
                id="p-atual"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <FieldError message={passwordErrors["currentPassword"]} />
            </Field>
            <Field label="Nova senha" htmlFor="p-nova">
              <Input
                id="p-nova"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />
              <FieldError message={passwordErrors["newPassword"]} />
            </Field>
            <Field label="Confirmar nova senha" htmlFor="p-conf">
              <Input
                id="p-conf"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
              />
              <FieldError message={passwordErrors["confirmPassword"]} />
            </Field>
            <Button type="submit" variant="secondary" disabled={savingPassword}>
              {savingPassword ? <Loader2 className="size-4 animate-spin" /> : "Atualizar senha"}
            </Button>
          </form>
        </section>
      </div>
    </DashboardShell>
  );
}
