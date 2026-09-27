import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouteContext, useRouter } from "@tanstack/react-router";

import { getCurrentUserFn, logoutFn } from "@/functions/auth";

/** Sessão real: o utilizador vem do servidor (cookie HttpOnly), via contexto da rota raiz. */

export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: ["session"],
    queryFn: () => getCurrentUserFn(),
    staleTime: 30_000,
  });

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUserFn>>>;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

/** Recarrega o utilizador depois de login, logout ou alteração de perfil. */
export function useRefreshSession() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    queryClient.removeQueries({ queryKey: ["session"] });
    await router.invalidate();
  };
}

export function useSession() {
  const { user } = useRouteContext({ from: "__root__" });
  const refresh = useRefreshSession();
  const navigate = useNavigate();

  const signOut = async () => {
    await logoutFn();
    await refresh();
    await navigate({ to: "/" });
  };

  return { user, isAuthenticated: user !== null, signOut };
}
