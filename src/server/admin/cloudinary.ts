import { v2 as cloudinary } from "cloudinary";

import { IMAGE_FORMATS, type AccountImageInput } from "@/lib/admin";

import { serverEnv } from "../env";

/** Pasta das screenshots enviadas pelo admin. */
export const UPLOAD_FOLDER = "plutao-shop/accounts";
/** Pastas aceites ao guardar (inclui as imagens do seed). */
const ACCEPTED_PREFIXES = ["plutao-shop/accounts/", "plutao-shop/seed/"];

function configure() {
  const env = serverEnv();
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return env;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
}

/**
 * Assinatura para upload DIRETO do browser para o Cloudinary (o ficheiro não passa pelo
 * nosso servidor). A assinatura fixa a pasta e os formatos permitidos e expira em ~1h.
 */
export function createUploadSignature(): UploadSignature {
  const env = configure();
  const timestamp = Math.floor(Date.now() / 1000);
  const allowedFormats = IMAGE_FORMATS.join(",");
  const params = { timestamp, folder: UPLOAD_FOLDER, allowed_formats: allowedFormats };
  const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET);
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder: UPLOAD_FOLDER,
    allowedFormats,
  };
}

/** Só aceita imagens do NOSSO Cloudinary e das NOSSAS pastas (não confiar no cliente). */
export function isTrustedImage(image: AccountImageInput): boolean {
  const { CLOUDINARY_CLOUD_NAME } = serverEnv();
  const base = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/`;
  return (
    image.url.startsWith(base) &&
    ACCEPTED_PREFIXES.some((prefix) => image.publicId.startsWith(prefix)) &&
    image.url.includes(`/${image.publicId}.`)
  );
}

/** Apaga imagens do Cloudinary (melhor esforço). Nunca apaga as imagens do seed. */
export async function destroyImages(publicIds: string[]): Promise<void> {
  const deletable = publicIds.filter((id) => id.startsWith(`${UPLOAD_FOLDER}/`));
  if (deletable.length === 0) return;
  configure();
  await Promise.all(
    deletable.map(async (publicId) => {
      try {
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
      } catch (error) {
        console.error(`[cloudinary] falha ao apagar ${publicId}`, error);
      }
    }),
  );
}
