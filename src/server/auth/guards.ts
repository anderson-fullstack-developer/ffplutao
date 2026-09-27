import { getSessionUser, type SessionUser } from "./session";

/**
 * Erro com código HTTP. Lançado dentro de server functions: o cliente recebe um erro,
 * nunca os dados.
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Sessão expirada. Entre novamente.");
  return user;
}

/** Obrigatório no início de TODAS as server functions de admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new HttpError(403, "Acesso negado.");
  return user;
}
