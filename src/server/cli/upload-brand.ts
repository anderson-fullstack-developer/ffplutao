/**
 * Envia o ícone da marca para o Cloudinary (PNG), usado na página de pagamento.
 *   npm run brand:upload
 * Voltar a correr sempre que mudar de conta/ambiente Cloudinary ou alterar o ícone.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { v2 as cloudinary } from "cloudinary";

try {
  process.loadEnvFile(".env");
} catch {
  // variáveis já no ambiente
}

const { serverEnv } = await import("../env");
const { BRAND_ICON_PUBLIC_ID } = await import("../payments/branding");

const env = serverEnv();
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

const svg = readFileSync(resolve("src/assets/brand/icon.svg"));
const result = await cloudinary.uploader.upload(`data:image/svg+xml;base64,${svg.toString("base64")}`, {
  public_id: BRAND_ICON_PUBLIC_ID,
  overwrite: true,
  invalidate: true,
  format: "png",
  resource_type: "image",
});
console.log(`✔ Ícone enviado: ${result.secure_url} (${result.width}x${result.height})`);
