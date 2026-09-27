import { randomBytes } from "node:crypto";
import { argon2id, argon2Verify } from "hash-wasm";

/**
 * Senhas dos utilizadores da loja: HASH Argon2id (nunca reversível).
 * Parâmetros mínimos recomendados pela OWASP: m=19 MiB, t=2, p=1.
 * Implementação WebAssembly — funciona na Vercel sem binários nativos.
 */
const PARAMS = { parallelism: 1, iterations: 2, memorySize: 19_456, hashLength: 32 } as const;

export async function hashPassword(password: string): Promise<string> {
  return argon2id({ password, salt: randomBytes(16), ...PARAMS, outputType: "encoded" });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2Verify({ hash, password });
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Quando o email não existe, gasta o mesmo tempo que uma verificação real,
 * para não revelar (pelo tempo de resposta) quais emails estão registados.
 */
export async function burnPasswordCheck(password: string): Promise<false> {
  dummyHash ??= hashPassword("plutao-timing-equalizer");
  await verifyPassword(await dummyHash, password);
  return false;
}
