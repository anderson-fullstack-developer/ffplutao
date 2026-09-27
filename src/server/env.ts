import { z } from "zod";

/**
 * Variáveis de ambiente do servidor, validadas uma única vez.
 * Nunca importar este módulo no cliente (src/server/** está protegido pelo TanStack Start).
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url(),

  DATABASE_URL: z.string().url(),

  SESSION_SECRET: z.string().min(32),

  CREDENTIALS_ENCRYPTION_KEY: z.string().min(1),
  CREDENTIALS_KEY_VERSION: z.coerce.number().int().positive().default(1),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // Opcionais até às fases em que são usadas.
  ADMIN_EMAIL: z.string().email().optional().or(z.literal("")),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Mostra só os nomes das variáveis com problema, nunca os valores.
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Variáveis de ambiente inválidas:\n  - ${problems.join("\n  - ")}`);
  }

  cached = parsed.data;
  return cached;
}
