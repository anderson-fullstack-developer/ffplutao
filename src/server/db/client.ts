import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { serverEnv } from "../env";
import * as schema from "./schema";

// Driver WebSocket do Neon: suporta transações interativas (necessárias para
// reservar contas e processar webhooks de forma atómica).
neonConfig.webSocketConstructor = ws;

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool, schema });
  return { db, pool };
}

export type Db = ReturnType<typeof createDb>["db"];

let instance: Db | undefined;

/** Instância partilhada, criada no primeiro uso (não falha no import se faltar env). */
export function getDb(): Db {
  if (!instance) {
    instance = createDb(serverEnv().DATABASE_URL).db;
  }
  return instance;
}
