import { eq, sql } from "drizzle-orm";

import { getDb } from "../db/client";
import { authRateLimits } from "../db/schema";

/**
 * Limite de tentativas guardado no Postgres (em serverless a memória não é partilhada
 * entre instâncias, por isso um limite em memória não protegeria nada).
 */

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

export const LOGIN_PER_EMAIL: RateLimitRule = { limit: 5, windowSeconds: 15 * 60 };
export const LOGIN_PER_IP: RateLimitRule = { limit: 30, windowSeconds: 15 * 60 };
export const REGISTER_PER_IP: RateLimitRule = { limit: 5, windowSeconds: 60 * 60 };

export async function isRateLimited(key: string, rule: RateLimitRule): Promise<boolean> {
  const [row] = await getDb()
    .select({
      blocked: sql<boolean>`${authRateLimits.count} >= ${rule.limit}
        and ${authRateLimits.windowStart} > now() - make_interval(secs => ${rule.windowSeconds})`,
    })
    .from(authRateLimits)
    .where(eq(authRateLimits.key, key))
    .limit(1);
  return row?.blocked ?? false;
}

/** Regista uma tentativa (atómico). Se a janela já expirou, recomeça a contagem. */
export async function recordAttempt(key: string, rule: RateLimitRule): Promise<void> {
  const expired = sql`${authRateLimits.windowStart} <= now() - make_interval(secs => ${rule.windowSeconds})`;
  await getDb()
    .insert(authRateLimits)
    .values({ key, count: 1, windowStart: sql`now()` })
    .onConflictDoUpdate({
      target: authRateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${authRateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${authRateLimits.windowStart} end`,
      },
    });
}

export async function clearAttempts(key: string): Promise<void> {
  await getDb().delete(authRateLimits).where(eq(authRateLimits.key, key));
}
