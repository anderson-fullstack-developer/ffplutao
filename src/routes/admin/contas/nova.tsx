import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { AccountForm } from "@/components/admin/account-form";

export const Route = createFileRoute("/admin/contas/nova")({
  head: () => ({
    meta: [
      { title: "Adicionar conta | Plutão Shop" },
      { name: "description", content: "Publique uma nova conta no catálogo da Plutão Shop." },
      { property: "og:title", content: "Adicionar conta | Plutão Shop" },
      { property: "og:description", content: "Formulário de criação de contas." },
    ],
  }),
  component: NovaConta,
});

function NovaConta() {
  return (
    <AdminShell title="Adicionar conta" description="Preencha os detalhes da nova conta.">
      <AccountForm />
    </AdminShell>
  );
}
