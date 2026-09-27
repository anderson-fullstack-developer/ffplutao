/**
 * Cria um administrador, ou promove a ADMIN um utilizador que já existe.
 *
 *   npm run admin:create -- email@exemplo.pt
 *
 * A senha é pedida no terminal (não fica no histórico nem no código).
 */
import { createInterface } from "node:readline";

import { eq, sql } from "drizzle-orm";

try {
  process.loadEnvFile(".env");
} catch {
  // variáveis já no ambiente
}

const { serverEnv } = await import("../env");
const { createDb } = await import("../db/client");
const { users, sessions } = await import("../db/schema");
const { hashPassword } = await import("../auth/password");
const { loginSchema, registerSchema } = await import("../../lib/auth-schemas");

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
const lines = rl[Symbol.asyncIterator]();

async function ask(question: string, { hidden = false } = {}): Promise<string> {
  process.stdout.write(question);
  if (hidden && process.stdin.isTTY) {
    // Esconde o que é escrito (senha).
    return new Promise((resolve) => {
      const stdin = process.stdin;
      let value = "";
      stdin.setRawMode(true);
      stdin.resume();
      const onData = (buffer: Buffer) => {
        for (const char of buffer.toString("utf8")) {
          if (char === "\r" || char === "\n") {
            stdin.setRawMode(false);
            stdin.off("data", onData);
            process.stdout.write("\n");
            resolve(value);
            return;
          }
          if (char === "\u0003") process.exit(130); // Ctrl+C
          if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
          else value += char;
        }
      };
      stdin.on("data", onData);
    });
  }
  const next = await lines.next();
  return next.done ? "" : String(next.value);
}

async function main() {
  const env = serverEnv();
  const emailArg = process.argv[2] ?? (await ask("Email do administrador: "));
  const emailParsed = loginSchema.shape.email.safeParse(emailArg);
  if (!emailParsed.success) throw new Error("Email inválido.");
  const email = emailParsed.data;

  const { db, pool } = createDb(env.DATABASE_URL);
  try {
    const [existing] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(sql`lower(${users.email})`, email))
      .limit(1);

    if (existing) {
      if (existing.role === "ADMIN") {
        console.log(`${email} já é ADMIN.`);
        return;
      }
      await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, existing.id));
      // Força novo login para o papel novo entrar em vigor em todas as sessões.
      await db.delete(sessions).where(eq(sessions.userId, existing.id));
      console.log(`✔ ${email} promovido a ADMIN (terá de entrar novamente).`);
      return;
    }

    const name = await ask("Nome: ");
    const password = await ask("Senha (mín. 8 caracteres): ", { hidden: true });
    const confirmPassword = await ask("Confirmar senha: ", { hidden: true });

    const parsed = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
      acceptTerms: true,
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
    }

    await db.insert(users).values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "ADMIN",
    });
    console.log(`✔ Administrador ${email} criado.`);
  } finally {
    await pool.end();
    rl.close();
  }
}

try {
  await main();
} catch (error) {
  console.error(`✘ ${(error as Error).message}`);
  process.exitCode = 1;
}
