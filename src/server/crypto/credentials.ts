import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

import { serverEnv } from "../env";

/**
 * Encriptação reversível das credenciais das contas vendidas (AES-256-GCM).
 *
 * - A chave vive só no ambiente (CREDENTIALS_ENCRYPTION_KEY), nunca na base de dados.
 * - O accountId entra como AAD: um ciphertext copiado para outra conta não desencripta.
 * - Desencriptar apenas na rota de revelação, depois de validar ownership + pagamento.
 *
 * NÃO confundir com a senha dos utilizadores da loja, que é HASHED (Argon2).
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export const accountCredentialsSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
  recoveryEmail: z.string().nullable(),
  instructions: z.string().nullable(),
});

export type AccountCredentials = z.infer<typeof accountCredentialsSchema>;

export interface EncryptedCredentials {
  keyVersion: number;
  iv: string;
  authTag: string;
  ciphertext: string;
}

function loadKey(version: number): Buffer {
  const env = serverEnv();
  if (version !== env.CREDENTIALS_KEY_VERSION) {
    throw new Error(`Chave de encriptação versão ${version} não disponível.`);
  }
  const key = Buffer.from(env.CREDENTIALS_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY tem de ter exatamente 32 bytes (base64).");
  }
  return key;
}

function aad(accountId: string): Buffer {
  return Buffer.from(`plutao:account-credentials:${accountId}`, "utf8");
}

export function encryptCredentials(
  accountId: string,
  credentials: AccountCredentials,
): EncryptedCredentials {
  const keyVersion = serverEnv().CREDENTIALS_KEY_VERSION;
  const plaintext = JSON.stringify(accountCredentialsSchema.parse(credentials));

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, loadKey(keyVersion), iv);
  cipher.setAAD(aad(accountId));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return {
    keyVersion,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptCredentials(
  accountId: string,
  encrypted: EncryptedCredentials,
): AccountCredentials {
  const decipher = createDecipheriv(
    ALGORITHM,
    loadKey(encrypted.keyVersion),
    Buffer.from(encrypted.iv, "base64"),
  );
  decipher.setAAD(aad(accountId));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");

  return accountCredentialsSchema.parse(JSON.parse(plaintext));
}
