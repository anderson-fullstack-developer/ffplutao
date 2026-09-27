import { and, asc, count, desc, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";

import {
  FEATURES,
  LEVEL_RANGES,
  PAGE_SIZE,
  PRICE_RANGES,
  type CatalogPage,
  type CatalogSearch,
  type PublicAccount,
  type PublicAccountStatus,
  type PublicImage,
} from "@/lib/catalog";

import { getDb } from "../db/client";
import { accountImages, accounts } from "../db/schema";

/**
 * Consultas públicas do catálogo.
 * REGRA: selecionar sempre uma lista EXPLÍCITA de colunas públicas.
 * Nunca `select()` completo, nunca juntar account_credentials, nunca devolver admin_notes.
 */

const publicColumns = {
  id: accounts.id,
  title: accounts.title,
  description: accounts.description,
  priceCents: accounts.priceCents,
  currency: accounts.currency,
  level: accounts.level,
  server: accounts.server,
  accountYear: accounts.accountYear,
  skins: accounts.skins,
  evolutionWeapons: accounts.evolutionWeapons,
  emotes: accounts.emotes,
  characters: accounts.characters,
  passes: accounts.passes,
  highlights: accounts.highlights,
  observations: accounts.observations,
  featured: accounts.featured,
  status: accounts.status,
  reservedUntil: accounts.reservedUntil,
  publishedAt: accounts.publishedAt,
} as const;

type PublicRow = Pick<typeof accounts.$inferSelect, keyof typeof publicColumns>;

/** Reserva ativa = RESERVED com prazo no futuro. Reserva expirada conta como disponível. */
const activeReservation = sql`${accounts.status} = 'RESERVED' and ${accounts.reservedUntil} > now()`;
const effectivelyAvailable = or(
  eq(accounts.status, "AVAILABLE"),
  and(eq(accounts.status, "RESERVED"), sql`${accounts.reservedUntil} <= now()`),
)!;

/** O que aparece na listagem: disponíveis + reservadas (vendidas, rascunhos e desativadas não). */
const listedInCatalog = inArray(accounts.status, ["AVAILABLE", "RESERVED"]);

/** Página de detalhe também abre contas vendidas (links partilhados não dão 404). */
const visibleOnDetail = inArray(accounts.status, ["AVAILABLE", "RESERVED", "SOLD"]);

function effectiveStatus(row: Pick<PublicRow, "status" | "reservedUntil">): PublicAccountStatus {
  if (row.status === "SOLD") return "SOLD";
  if (row.status === "RESERVED" && row.reservedUntil && row.reservedUntil.getTime() > Date.now()) {
    return "RESERVED";
  }
  return "AVAILABLE";
}

/** Imagens do Cloudinary em formato/qualidade automáticos e tamanho adequado. */
function cloudinaryVariant(url: string, width: number): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

function toPublicImage(image: {
  url: string;
  width: number | null;
  height: number | null;
}): PublicImage {
  return {
    url: cloudinaryVariant(image.url, 1600),
    thumbUrl: cloudinaryVariant(image.url, 640),
    width: image.width,
    height: image.height,
  };
}

async function imagesFor(accountIds: string[], onlyPrimary: boolean) {
  const byAccount = new Map<string, PublicImage[]>();
  if (accountIds.length === 0) return byAccount;

  const rows = await getDb()
    .select({
      accountId: accountImages.accountId,
      url: accountImages.url,
      width: accountImages.width,
      height: accountImages.height,
    })
    .from(accountImages)
    .where(inArray(accountImages.accountId, accountIds))
    .orderBy(
      asc(accountImages.accountId),
      asc(accountImages.position),
      asc(accountImages.createdAt),
    );

  for (const row of rows) {
    const list = byAccount.get(row.accountId) ?? [];
    if (onlyPrimary && list.length > 0) continue;
    list.push(toPublicImage(row));
    byAccount.set(row.accountId, list);
  }
  return byAccount;
}

function toPublicAccount(row: PublicRow, images: PublicImage[]): PublicAccount {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceCents: row.priceCents,
    currency: row.currency,
    level: row.level,
    server: row.server,
    accountYear: row.accountYear,
    skins: row.skins,
    evolutionWeapons: row.evolutionWeapons,
    emotes: row.emotes,
    characters: row.characters,
    passes: row.passes,
    highlights: row.highlights,
    observations: row.observations,
    featured: row.featured,
    status: effectiveStatus(row),
    images,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

function featureCondition(feature: (typeof FEATURES)[number]["value"]): SQL {
  switch (feature) {
    case "evolutivas":
      return gte(accounts.evolutionWeapons, 3);
    case "skins":
      return gte(accounts.skins, 200);
    case "emotes":
      return gte(accounts.emotes, 10);
    case "passes":
      return gte(accounts.passes, 2);
    case "colecao":
      return sql`${"Itens de coleção"} = any(${accounts.highlights})`;
  }
}

/** Escapa % e _ para a pesquisa ILIKE tratar o texto literalmente. */
function likePattern(text: string) {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function listCatalog(search: CatalogSearch): Promise<CatalogPage> {
  const conditions: SQL[] = [listedInCatalog];

  if (search.q) {
    conditions.push(sql`${accounts.title} ilike ${likePattern(search.q)}`);
  }

  const price = PRICE_RANGES.find((range) => range.value === search.preco);
  if (price?.min != null) conditions.push(gte(accounts.priceCents, price.min));
  if (price?.max != null) conditions.push(lte(accounts.priceCents, price.max));

  const level = LEVEL_RANGES.find((range) => range.value === search.nivel);
  if (level?.min != null) conditions.push(gte(accounts.level, level.min));
  if (level?.max != null) conditions.push(lte(accounts.level, level.max));

  if (search.servidor?.length) conditions.push(inArray(accounts.server, search.servidor));
  for (const feature of search.carac ?? []) conditions.push(featureCondition(feature));

  const where = and(...conditions);

  // Disponíveis primeiro; reservadas (temporariamente indisponíveis) no fim.
  const availabilityFirst = sql`case when ${activeReservation} then 1 else 0 end`;
  const order = (() => {
    switch (search.ordem) {
      case "menor":
        return [asc(accounts.priceCents)];
      case "maior":
        return [desc(accounts.priceCents)];
      case "nivel":
        return [desc(accounts.level)];
      default:
        return [sql`${accounts.publishedAt} desc nulls last`, desc(accounts.createdAt)];
    }
  })();

  const db = getDb();
  const [totalRow] = await db.select({ total: count() }).from(accounts).where(where);
  const total = totalRow?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(search.pagina ?? 1, pageCount);

  const rows = await db
    .select(publicColumns)
    .from(accounts)
    .where(where)
    .orderBy(availabilityFirst, ...order, asc(accounts.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const images = await imagesFor(
    rows.map((row) => row.id),
    true,
  );

  return {
    items: rows.map((row) => toPublicAccount(row, images.get(row.id) ?? [])),
    total,
    page,
    pageCount,
  };
}

export async function getFeatured(limit = 8): Promise<{
  items: PublicAccount[];
  availableCount: number;
}> {
  const db = getDb();
  const rows = await db
    .select(publicColumns)
    .from(accounts)
    .where(and(effectivelyAvailable, eq(accounts.featured, true)))
    .orderBy(sql`${accounts.publishedAt} desc nulls last`, desc(accounts.createdAt))
    .limit(limit);

  const [countRow] = await db.select({ total: count() }).from(accounts).where(effectivelyAvailable);

  const images = await imagesFor(
    rows.map((row) => row.id),
    true,
  );
  return {
    items: rows.map((row) => toPublicAccount(row, images.get(row.id) ?? [])),
    availableCount: countRow?.total ?? 0,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPublicAccount(id: string): Promise<PublicAccount | null> {
  if (!UUID.test(id)) return null;

  const [row] = await getDb()
    .select(publicColumns)
    .from(accounts)
    .where(and(eq(accounts.id, id), visibleOnDetail))
    .limit(1);
  if (!row) return null;

  const images = await imagesFor([row.id], false);
  return toPublicAccount(row, images.get(row.id) ?? []);
}
