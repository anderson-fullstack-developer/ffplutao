import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env");
} catch {
  // Sem .env (ex.: CI/Vercel): as variáveis vêm do ambiente.
}

// Migrations usam a ligação DIRETA (sem pooler), como recomenda o Neon.
const url = process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"];
if (!url) {
  throw new Error("Defina DATABASE_URL_UNPOOLED (ou DATABASE_URL) no .env");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
