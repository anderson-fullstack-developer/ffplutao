import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

/**
 * Todas as páginas /admin/* exigem papel ADMIN.
 * Um cliente comum recebe 404 (não revela que a área existe).
 * Proteção de interface — cada server function de admin volta a validar o papel.
 */
export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (context.user.role !== "ADMIN") {
      throw notFound();
    }
    return { user: context.user };
  },
});
