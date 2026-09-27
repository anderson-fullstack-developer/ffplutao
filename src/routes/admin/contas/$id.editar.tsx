import { createFileRoute, notFound } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { AccountForm } from "@/components/admin/account-form";
import { getAccount } from "@/mock/accounts";

export const Route = createFileRoute("/admin/contas/$id/editar")({
  loader: ({ params }) => {
    const account = getAccount(params.id);
    if (!account) throw notFound();
    return { account };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Editar ${loaderData?.account.title ?? "conta"} | Plutão Shop` },
      { name: "description", content: "Edite os detalhes de uma conta publicada." },
      { property: "og:title", content: "Editar conta | Plutão Shop" },
      { property: "og:description", content: "Formulário de edição de contas." },
    ],
  }),
  component: EditarConta,
});

function EditarConta() {
  const { account } = Route.useLoaderData();
  return (
    <AdminShell title="Editar conta" description={account.title}>
      <AccountForm account={account} />
    </AdminShell>
  );
}
