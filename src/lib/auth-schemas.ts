import { z } from "zod";

/** Regras de validação partilhadas entre formulários (cliente) e server functions. */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Indique o email")
  .max(254, "Email demasiado longo")
  .email("Email inválido");

const newPassword = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .max(128, "A senha pode ter no máximo 128 caracteres");

const name = z.string().trim().min(2, "Indique o seu nome").max(80, "Nome demasiado longo");

export const registerSchema = z
  .object({
    name,
    email,
    password: newPassword,
    confirmPassword: z.string(),
    acceptTerms: z
      .boolean()
      .refine((accepted) => accepted, "Tem de aceitar os Termos e a Política de Privacidade"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Indique a senha").max(128),
});

export const updateProfileSchema = z.object({ name });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Indique a senha atual").max(128),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type FormResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in result)) result[key] = issue.message;
  }
  return result;
}

/** Só aceita caminhos internos ("/..."), para impedir redirecionamentos para outros sites. */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
