/**
 * Seed de desenvolvimento: contas de exemplo (públicas + credenciais fictícias encriptadas)
 * e screenshots no Cloudinary (pasta plutao-shop/seed).
 *
 * Uso:
 *   npm run db:seed            → só corre se ainda não existirem contas
 *   npm run db:seed -- --reset → apaga as contas existentes (se não houver pedidos) e recria
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { v2 as cloudinary } from "cloudinary";
import { count } from "drizzle-orm";

try {
  process.loadEnvFile(".env");
} catch {
  // variáveis já no ambiente
}

const { serverEnv } = await import("../env");
const { createDb } = await import("./client");
const { accountCredentials, accountImages, accounts, orders } = await import("./schema");
const { encryptCredentials } = await import("../crypto/credentials");

const env = serverEnv();
if (env.NODE_ENV === "production") {
  throw new Error("O seed não pode correr em produção.");
}

type SeedStatus = "AVAILABLE" | "DISABLED" | "DRAFT";

interface SeedAccount {
  n: number;
  price: number;
  level: number;
  server: "Brasil" | "Europa" | "América Latina";
  year: number;
  skins: number;
  evolutionWeapons: number;
  emotes: number;
  characters: number;
  passes: number;
  status: SeedStatus;
  featured?: boolean;
  createdAt: string;
  highlights: string[];
}

// Mesmos dados de src/mock/accounts.ts (status adaptados: nada é "reservado"/"vendido" sem pedido).
const seedAccounts: SeedAccount[] = [
  {
    n: 128,
    price: 69.9,
    level: 74,
    server: "Brasil",
    year: 2020,
    skins: 350,
    evolutionWeapons: 7,
    emotes: 15,
    characters: 28,
    passes: 4,
    status: "AVAILABLE",
    featured: true,
    createdAt: "2026-09-18",
    highlights: ["Skins raras", "Armas evolutivas", "Passes antigos"],
  },
  {
    n: 92,
    price: 24.9,
    level: 32,
    server: "Europa",
    year: 2022,
    skins: 80,
    evolutionWeapons: 1,
    emotes: 5,
    characters: 12,
    passes: 1,
    status: "AVAILABLE",
    createdAt: "2026-09-12",
    highlights: ["Boa para começar"],
  },
  {
    n: 141,
    price: 119.9,
    level: 81,
    server: "Brasil",
    year: 2019,
    skins: 520,
    evolutionWeapons: 11,
    emotes: 26,
    characters: 34,
    passes: 7,
    status: "AVAILABLE",
    featured: true,
    createdAt: "2026-09-20",
    highlights: ["Itens de coleção", "Skins raras", "Emotes raros"],
  },
  {
    n: 77,
    price: 45.5,
    level: 58,
    server: "América Latina",
    year: 2021,
    skins: 190,
    evolutionWeapons: 4,
    emotes: 9,
    characters: 20,
    passes: 2,
    status: "AVAILABLE",
    featured: true,
    createdAt: "2026-09-08",
    highlights: ["Armas evolutivas"],
  },
  {
    n: 203,
    price: 189.0,
    level: 88,
    server: "Brasil",
    year: 2018,
    skins: 740,
    evolutionWeapons: 14,
    emotes: 40,
    characters: 38,
    passes: 9,
    status: "AVAILABLE",
    featured: true,
    createdAt: "2026-09-22",
    highlights: ["Itens de coleção", "Passes antigos", "Skins raras"],
  },
  {
    n: 66,
    price: 18.9,
    level: 21,
    server: "Europa",
    year: 2023,
    skins: 42,
    evolutionWeapons: 0,
    emotes: 3,
    characters: 8,
    passes: 0,
    status: "AVAILABLE",
    createdAt: "2026-08-30",
    highlights: ["Entrada acessível"],
  },
  {
    n: 112,
    price: 89.9,
    level: 69,
    server: "América Latina",
    year: 2020,
    skins: 410,
    evolutionWeapons: 8,
    emotes: 18,
    characters: 30,
    passes: 5,
    status: "AVAILABLE",
    featured: true,
    createdAt: "2026-09-15",
    highlights: ["Armas evolutivas", "Emotes raros"],
  },
  {
    n: 150,
    price: 59.0,
    level: 63,
    server: "Brasil",
    year: 2021,
    skins: 240,
    evolutionWeapons: 5,
    emotes: 11,
    characters: 22,
    passes: 3,
    status: "AVAILABLE",
    featured: true,
    createdAt: "2026-09-10",
    highlights: ["Skins raras"],
  },
  {
    n: 34,
    price: 32.0,
    level: 44,
    server: "Europa",
    year: 2022,
    skins: 120,
    evolutionWeapons: 2,
    emotes: 7,
    characters: 15,
    passes: 1,
    status: "DISABLED",
    createdAt: "2026-08-21",
    highlights: ["Conta equilibrada"],
  },
  {
    n: 188,
    price: 139.9,
    level: 79,
    server: "Brasil",
    year: 2019,
    skins: 600,
    evolutionWeapons: 12,
    emotes: 31,
    characters: 36,
    passes: 6,
    status: "AVAILABLE",
    featured: true,
    createdAt: "2026-09-19",
    highlights: ["Itens de coleção", "Armas evolutivas"],
  },
  {
    n: 101,
    price: 74.5,
    level: 71,
    server: "América Latina",
    year: 2020,
    skins: 330,
    evolutionWeapons: 6,
    emotes: 14,
    characters: 26,
    passes: 4,
    status: "AVAILABLE",
    featured: true,
    createdAt: "2026-09-16",
    highlights: ["Emotes raros", "Passes antigos"],
  },
  {
    n: 57,
    price: 21.5,
    level: 27,
    server: "Europa",
    year: 2023,
    skins: 60,
    evolutionWeapons: 1,
    emotes: 4,
    characters: 10,
    passes: 0,
    status: "AVAILABLE",
    createdAt: "2026-09-02",
    highlights: ["Entrada acessível"],
  },
  {
    n: 166,
    price: 99.0,
    level: 76,
    server: "Brasil",
    year: 2020,
    skins: 455,
    evolutionWeapons: 9,
    emotes: 22,
    characters: 32,
    passes: 5,
    status: "AVAILABLE",
    createdAt: "2026-09-21",
    highlights: ["Skins raras", "Armas evolutivas"],
  },
  {
    n: 45,
    price: 39.9,
    level: 51,
    server: "América Latina",
    year: 2021,
    skins: 160,
    evolutionWeapons: 3,
    emotes: 8,
    characters: 18,
    passes: 2,
    status: "AVAILABLE",
    createdAt: "2026-09-05",
    highlights: ["Conta equilibrada"],
  },
  // Rascunho: serve para confirmar que DRAFT nunca aparece no catálogo.
  {
    n: 999,
    price: 10.0,
    level: 5,
    server: "Europa",
    year: 2024,
    skins: 3,
    evolutionWeapons: 0,
    emotes: 0,
    characters: 2,
    passes: 0,
    status: "DRAFT",
    createdAt: "2026-09-25",
    highlights: [],
  },
];

const DESCRIPTION =
  "Conta com diversos itens de coleção, skins antigas e armas evolutivas. Ideal para jogadores que procuram uma conta completa e com bom histórico.";

interface UploadedImage {
  publicId: string;
  url: string;
  width: number;
  height: number;
}

async function uploadSeedImages(): Promise<UploadedImage[]> {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const uploaded: UploadedImage[] = [];
  for (const name of ["acc-1", "acc-2", "acc-3", "acc-4"]) {
    const file = readFileSync(resolve("src/assets", `${name}.jpg`));
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${file.toString("base64")}`,
      {
        folder: "plutao-shop/seed",
        public_id: name,
        overwrite: false, // idempotente: se já existe, devolve o existente
        resource_type: "image",
      },
    );
    uploaded.push({
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
    });
    console.log(`  imagem ${name} → ${result.public_id}`);
  }
  return uploaded;
}

async function main() {
  const reset = process.argv.includes("--reset");
  const { db, pool } = createDb(env.DATABASE_URL);

  try {
    const [existing] = await db.select({ total: count() }).from(accounts);
    if ((existing?.total ?? 0) > 0) {
      if (!reset) {
        console.log(
          `Já existem ${existing?.total} contas. Nada a fazer (use --reset para recriar).`,
        );
        return;
      }
      const [orderCount] = await db.select({ total: count() }).from(orders);
      if ((orderCount?.total ?? 0) > 0) {
        throw new Error(
          "Existem pedidos na base de dados — o --reset foi bloqueado por segurança.",
        );
      }
      await db.delete(accounts); // imagens e credenciais apagam em cascata
      console.log("Contas antigas apagadas.");
    }

    console.log("A enviar imagens para o Cloudinary...");
    const images = await uploadSeedImages();

    await db.transaction(async (tx) => {
      for (const [index, seed] of seedAccounts.entries()) {
        const createdAt = new Date(`${seed.createdAt}T12:00:00Z`);
        const [row] = await tx
          .insert(accounts)
          .values({
            title: `Conta Free Fire #${seed.n}`,
            description: DESCRIPTION,
            priceCents: Math.round(seed.price * 100),
            level: seed.level,
            server: seed.server,
            accountYear: seed.year,
            skins: seed.skins,
            evolutionWeapons: seed.evolutionWeapons,
            emotes: seed.emotes,
            characters: seed.characters,
            passes: seed.passes,
            highlights: seed.highlights,
            featured: Boolean(seed.featured),
            status: seed.status,
            publishedAt: seed.status === "AVAILABLE" ? createdAt : null,
            createdAt,
          })
          .returning({ id: accounts.id });

        if (!row) throw new Error("Falha ao inserir conta");

        await tx.insert(accountImages).values(
          [0, 1, 2, 3].map((offset, position) => {
            const image = images[(index + offset) % images.length]!;
            return { accountId: row.id, ...image, position };
          }),
        );

        await tx.insert(accountCredentials).values({
          accountId: row.id,
          ...encryptCredentials(row.id, {
            login: `demo-${seed.n}@example.test`,
            password: `Demo-${seed.n}-${Math.random().toString(36).slice(2, 10)}`,
            recoveryEmail: "demo-recovery@example.test",
            instructions: "Credenciais fictícias de desenvolvimento.",
          }),
        });
      }
    });

    console.log(`✔ ${seedAccounts.length} contas criadas (com imagens e credenciais encriptadas).`);
  } finally {
    await pool.end();
  }
}

await main();
