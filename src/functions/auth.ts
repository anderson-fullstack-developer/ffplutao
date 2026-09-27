import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import type { z } from "zod";

import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  toFieldErrors,
  updateProfileSchema,
  type FormResult,
} from "@/lib/auth-schemas";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/server/auth/password";
import {
  LOGIN_PER_EMAIL,
  LOGIN_PER_IP,
  REGISTER_PER_IP,
  clearAttempts,
  isRateLimited,
  recordAttempt,
} from "@/server/auth/rate-limit";
import {
  createSession,
  getSessionUser,
  invalidateCurrentSession,
  invalidateOtherSessions,
  requestIp,
} from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";

// Todo o código do servidor é usado apenas dentro de .handler(): o compilador do
// TanStack Start remove-o do bundle do browser.

const INVALID_LOGIN = "Email ou senha incorretos.";
const TOO_MANY = "Demasiadas tentativas. Tente novamente dentro de alguns minutos.";

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(async () => {
  return getSessionUser();
});

export const registerFn = createServerFn({ method: "POST" })
  .validator((data: z.input<typeof registerSchema>) => data)
  .handler(async ({ data }): Promise<FormResult> => {
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Verifique os dados do formulário.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }
    const { name, email, password } = parsed.data;

    const ipKey = `register:ip:${requestIp() ?? "unknown"}`;
    if (await isRateLimited(ipKey, REGISTER_PER_IP)) return { ok: false, error: TOO_MANY };
    await recordAttempt(ipKey, REGISTER_PER_IP);

    const passwordHash = await hashPassword(password);
    let userId: string;
    try {
      const [created] = await getDb()
        .insert(users)
        .values({ name, email, passwordHash })
        .returning({ id: users.id });
      if (!created) throw new Error("Falha ao criar utilizador");
      userId = created.id;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return {
          ok: false,
          error: "Este email já está registado.",
          fieldErrors: { email: "Este email já está registado." },
        };
      }
      throw error;
    }

    await createSession(userId);
    return { ok: true };
  });

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: z.input<typeof loginSchema>) => data)
  .handler(async ({ data }): Promise<FormResult> => {
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: INVALID_LOGIN, fieldErrors: toFieldErrors(parsed.error) };
    }
    const { email, password } = parsed.data;

    const emailKey = `login:email:${email}`;
    const ipKey = `login:ip:${requestIp() ?? "unknown"}`;
    if (
      (await isRateLimited(emailKey, LOGIN_PER_EMAIL)) ||
      (await isRateLimited(ipKey, LOGIN_PER_IP))
    ) {
      return { ok: false, error: TOO_MANY };
    }

    const [user] = await getDb()
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(sql`lower(${users.email})`, email))
      .limit(1);

    const valid = user
      ? await verifyPassword(user.passwordHash, password)
      : await burnPasswordCheck(password);

    if (!user || !valid) {
      await Promise.all([
        recordAttempt(emailKey, LOGIN_PER_EMAIL),
        recordAttempt(ipKey, LOGIN_PER_IP),
      ]);
      return { ok: false, error: INVALID_LOGIN };
    }

    await clearAttempts(emailKey);
    await createSession(user.id);
    return { ok: true };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  await invalidateCurrentSession();
  return { ok: true as const };
});

export const updateProfileFn = createServerFn({ method: "POST" })
  .validator((data: z.input<typeof updateProfileSchema>) => data)
  .handler(async ({ data }): Promise<FormResult> => {
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

    const parsed = updateProfileSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: "Verifique os dados.", fieldErrors: toFieldErrors(parsed.error) };
    }

    await getDb().update(users).set({ name: parsed.data.name }).where(eq(users.id, user.id));
    return { ok: true };
  });

export const changePasswordFn = createServerFn({ method: "POST" })
  .validator((data: z.input<typeof changePasswordSchema>) => data)
  .handler(async ({ data }): Promise<FormResult> => {
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

    const parsed = changePasswordSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: "Verifique os dados.", fieldErrors: toFieldErrors(parsed.error) };
    }

    const key = `password:user:${user.id}`;
    if (await isRateLimited(key, LOGIN_PER_EMAIL)) return { ok: false, error: TOO_MANY };

    const db = getDb();
    const [row] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!row || !(await verifyPassword(row.passwordHash, parsed.data.currentPassword))) {
      await recordAttempt(key, LOGIN_PER_EMAIL);
      return {
        ok: false,
        error: "A senha atual está incorreta.",
        fieldErrors: { currentPassword: "A senha atual está incorreta." },
      };
    }

    await clearAttempts(key);
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
      .where(eq(users.id, user.id));
    // Quem tiver a senha antiga (ex.: outro dispositivo) perde o acesso.
    await invalidateOtherSessions(user.id);
    return { ok: true };
  });
