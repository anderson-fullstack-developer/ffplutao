import { createFileRoute, notFound } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { AccountForm } from "@/components/admin/account-form";
import { getAdminAccountFn } from "@/functions/admin";

export const Route = createFileRoute("/admin/contas/$id/editar")({
  loader: async ({ params }) => {
    const account = await getAdminAccountFn({ data: { id: params.id } });
    if (!account) throw notFound();
    return { account };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Editar ${loaderData?.account.title ?? "conta"} | Plutão Shop` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditarConta,
});

function EditarConta() {
  const { account } = Route.useLoaderData();
  return (
    <AdminShell title="Editar conta" description={account.title}>
      {/* key: ao navegar entre contas o formulário é recriado com os dados certos */}
      <AccountForm key={account.id} account={account} />
    </AdminShell>
  );
}
