import { createFileRoute, redirect } from "@tanstack/react-router";

/** Todas as páginas /dashboard/* exigem sessão iniciada. */
export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user: context.user };
  },
});
