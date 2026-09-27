import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { currentUser } from "@/mock/users";
import { formatDate } from "@/lib/format";

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
  const [name, setName] = React.useState(currentUser.name);
  const [email, setEmail] = React.useState(currentUser.email);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    toast.success("Alterações guardadas");
  };

  const changePassword = (event: React.FormEvent) => {
    event.preventDefault();
    toast.success("Senha atualizada");
  };

  return (
    <DashboardShell title="Minha conta" description="Os seus dados pessoais e de acesso.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="surface-panel p-6">
          <div className="flex items-center gap-4">
            <span className="gold-surface flex size-14 items-center justify-center rounded-full text-lg font-bold">
              {currentUser.avatarInitials}
            </span>
            <div>
              <p className="font-bold">{currentUser.name}</p>
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cliente desde {formatDate(currentUser.createdAt)}
              </p>
            </div>
          </div>

          <form onSubmit={save} className="mt-7 space-y-4">
            <Field label="Nome" htmlFor="p-nome">
              <Input id="p-nome" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="p-email">
              <Input
                id="p-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Button type="submit">Salvar alterações</Button>
          </form>
        </section>

        <section className="surface-panel h-fit p-6">
          <h2 className="font-bold">Alterar senha</h2>
          <form onSubmit={changePassword} className="mt-5 space-y-4">
            <Field label="Senha atual" htmlFor="p-atual">
              <Input id="p-atual" type="password" placeholder="••••••••" />
            </Field>
            <Field label="Nova senha" htmlFor="p-nova">
              <Input id="p-nova" type="password" placeholder="••••••••" />
            </Field>
            <Field label="Confirmar nova senha" htmlFor="p-conf">
              <Input id="p-conf" type="password" placeholder="••••••••" />
            </Field>
            <Button type="submit" variant="secondary">
              Atualizar senha
            </Button>
          </form>
        </section>
      </div>
    </DashboardShell>
  );
}
