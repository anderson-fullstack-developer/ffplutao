import { createHash, randomBytes } from "node:crypto";
import { and, eq, lt, ne } from "drizzle-orm";
import {
  deleteCookie,
  getCookie,
  getRequestHeader,
  getRequestIP,
  setCookie,
} from "@tanstack/react-start/server";

import { getDb } from "../db/client";
import { sessions, users } from "../db/schema";
import { serverEnv } from "../env";

/**
 * Sessões no servidor com token opaco em cookie HttpOnly.
 * - O cookie leva um token aleatório de 32 bytes; na base de dados só fica o SHA-256.
 * - Logout / troca de senha revogam a sessão na hora (ao contrário de um JWT).
 */

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Se faltar menos do que isto para expirar, a sessão é renovada por mais 30 dias. */
const SESSION_RENEW_MS = 15 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
}

function isProduction() {
  return serverEnv().NODE_ENV === "production";
}

function cookieName() {
  // O prefixo __Host- obriga a Secure + Path=/ + sem Domain (só em HTTPS).
  return isProduction() ? "__Host-plutao_session" : "plutao_session";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function writeCookie(token: string, expiresAt: Date) {
  setCookie(cookieName(), token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

function clearCookie() {
  deleteCookie(cookieName(), {
    path: "/",
    secure: isProduction(),
    httpOnly: true,
    sameSite: "lax",
  });
}

export function requestIp(): string | null {
  return getRequestIP({ xForwardedFor: true }) ?? null;
}

function requestUserAgent(): string | null {
  return getRequestHeader("user-agent")?.slice(0, 512) ?? null;
}

export async function createSession(userId: string): Promise<void> {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // Limpeza oportunista das sessões expiradas deste utilizador.
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    ipAddress: requestIp(),
    userAgent: requestUserAgent(),
  });

  writeCookie(token, expiresAt);
}

function currentSessionId(): string | null {
  const token = getCookie(cookieName());
  // Tokens válidos têm 43 caracteres; qualquer outra coisa é lixo.
  if (!token || token.length > 64) return null;
  return hashToken(token);
}

/** Utilizador da sessão atual, ou null. Renova a sessão se estiver perto de expirar. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const sessionId = currentSessionId();
  if (!sessionId) return null;

  const db = getDb();
  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row) {
    clearCookie();
    return null;
  }

  const now = Date.now();
  if (row.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    clearCookie();
    return null;
  }

  if (row.expiresAt.getTime() - now < SESSION_RENEW_MS) {
    const expiresAt = new Date(now + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId));
    const token = getCookie(cookieName());
    if (token) writeCookie(token, expiresAt);
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Termina a sessão atual (logout). */
export async function invalidateCurrentSession(): Promise<void> {
  const sessionId = currentSessionId();
  if (sessionId) {
    await getDb().delete(sessions).where(eq(sessions.id, sessionId));
  }
  clearCookie();
}

/** Termina todas as outras sessões do utilizador (ex.: depois de trocar a senha). */
export async function invalidateOtherSessions(userId: string): Promise<void> {
  const sessionId = currentSessionId();
  const db = getDb();
  await db
    .delete(sessions)
    .where(
      sessionId
        ? and(eq(sessions.userId, userId), ne(sessions.id, sessionId))
        : eq(sessions.userId, userId),
    );
}
