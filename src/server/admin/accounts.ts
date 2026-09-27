import { and, asc, count, desc, eq, inArray, notInArray, sql, type SQL } from "drizzle-orm";

import {
  accountInputSchema,
  type AccountInput,
  type AccountStatus,
  type AdminAccountDetail,
  type AdminAccountRow,
  type AdminResult,
} from "@/lib/admin";
import { toFieldErrors } from "@/lib/auth-schemas";

import {
  decryptCredentials,
  encryptCredentials,
  type AccountCredentials,
} from "../crypto/credentials";
import { getDb } from "../db/client";
import { accountCredentials, accountImages, accounts, orders } from "../db/schema";
import { destroyImages, isTrustedImage } from "./cloudinary";

/** Erro de validação lançado dentro de uma transação (faz rollback) e devolvido ao formulário. */
class ValidationFailure extends Error {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCKED: AccountStatus[] = ["RESERVED", "SOLD"];

export async function listAdminAccounts(filters: {
  q?: string | undefined;
  status?: AccountStatus | undefined;
}): Promise<AdminAccountRow[]> {
  const db = getDb();
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(accounts.status, filters.status));
  if (filters.q) {
    const pattern = `%${filters.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conditions.push(sql`${accounts.title} ilike ${pattern}`);
  }

  const cover = sql<string | null>`(
    select ${accountImages.url} from ${accountImages}
    where ${accountImages.accountId} = ${accounts.id}
    order by ${accountImages.position} asc limit 1
  )`;
  const hasCredentials = sql<boolean>`exists (
    select 1 from ${accountCredentials} where ${accountCredentials.accountId} = ${accounts.id}
  )`;
  const ordersCount = sql<number>`(
    select count(*)::int from ${orders} where ${orders.accountId} = ${accounts.id}
  )`;

  const rows = await db
    .select({
      id: accounts.id,
      title: accounts.title,
      level: accounts.level,
      server: accounts.server,
      priceCents: accounts.priceCents,
      status: accounts.status,
      featured: accounts.featured,
      createdAt: accounts.createdAt,
      coverUrl: cover,
      hasCredentials,
      ordersCount,
    })
    .from(accounts)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(accounts.createdAt))
    .limit(500);

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function getAdminAccount(id: string): Promise<AdminAccountDetail | null> {
  if (!UUID.test(id)) return null;
  const db = getDb();

  const [row] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  if (!row) return null;

  const images = await db
    .select({
      publicId: accountImages.publicId,
      url: accountImages.url,
      width: accountImages.width,
      height: accountImages.height,
    })
    .from(accountImages)
    .where(eq(accountImages.accountId, id))
    .orderBy(asc(accountImages.position), asc(accountImages.createdAt));

  const [creds] = await db
    .select({ accountId: accountCredentials.accountId })
    .from(accountCredentials)
    .where(eq(accountCredentials.accountId, id));
  const [ordersRow] = await db.select({ n: count() }).from(orders).where(eq(orders.accountId, id));

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceCents: row.priceCents,
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
    adminNotes: row.adminNotes,
    featured: row.featured,
    status: row.status,
    reservedUntil: row.reservedUntil?.toISOString() ?? null,
    images,
    hasCredentials: Boolean(creds),
    ordersCount: ordersRow?.n ?? 0,
  };
}

/** Normaliza as credenciais do formulário: null = manter; login+senha obrigatórios se enviadas. */
function parseCredentials(
  input: AccountInput["credentials"],
): AccountCredentials | null | ValidationFailure {
  if (!input) return null;
  const nothing = !input.login && !input.password && !input.recoveryEmail && !input.instructions;
  if (nothing) return null;
  if (!input.login || !input.password) {
    return new ValidationFailure("Preencha o login e a senha da conta.", {
      "credentials.login": input.login ? "" : "Obrigatório",
      "credentials.password": input.password ? "" : "Obrigatório",
    });
  }
  return {
    login: input.login,
    password: input.password,
    recoveryEmail: input.recoveryEmail || null,
    instructions: input.instructions || null,
  };
}

/** Sincroniza imagens (ordem = posição; 0 = principal). Devolve os publicIds removidos. */
async function syncImages(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  accountId: string,
  images: AccountInput["images"],
): Promise<string[]> {
  const desired = images.map((image) => image.publicId);
  const removed = await tx
    .delete(accountImages)
    .where(
      desired.length
        ? and(eq(accountImages.accountId, accountId), notInArray(accountImages.publicId, desired))
        : eq(accountImages.accountId, accountId),
    )
    .returning({ publicId: accountImages.publicId });

  const existing = await tx
    .select({ id: accountImages.id, publicId: accountImages.publicId })
    .from(accountImages)
    .where(eq(accountImages.accountId, accountId));
  const byPublicId = new Map(existing.map((row) => [row.publicId, row.id]));

  for (const [position, image] of images.entries()) {
    const existingId = byPublicId.get(image.publicId);
    if (existingId) {
      await tx.update(accountImages).set({ position }).where(eq(accountImages.id, existingId));
    } else {
      await tx.insert(accountImages).values({ accountId, position, ...image });
    }
  }
  return removed.map((row) => row.publicId);
}

/** Apaga no Cloudinary as imagens que já não são usadas por nenhuma conta. */
async function destroyUnused(publicIds: string[]) {
  if (publicIds.length === 0) return;
  const stillUsed = await getDb()
    .select({ publicId: accountImages.publicId })
    .from(accountImages)
    .where(inArray(accountImages.publicId, publicIds));
  const used = new Set(stillUsed.map((row) => row.publicId));
  await destroyImages(publicIds.filter((id) => !used.has(id)));
}

function validate(raw: AccountInput) {
  const parsed = accountInputSchema.safeParse(raw);
  if (!parsed.success) {
    return new ValidationFailure("Verifique os campos assinalados.", toFieldErrors(parsed.error));
  }
  const data = parsed.data;
  if (!data.images.every(isTrustedImage)) {
    return new ValidationFailure("Imagem inválida. Volte a enviar as screenshots.");
  }
  if (new Set(data.images.map((image) => image.publicId)).size !== data.images.length) {
    return new ValidationFailure("Há imagens repetidas.");
  }
  const credentials = parseCredentials(data.credentials);
  if (credentials instanceof ValidationFailure) return credentials;
  return { data, credentials };
}

function publishRequirements(
  status: string,
  imagesCount: number,
  hasCredentials: boolean,
): ValidationFailure | null {
  if (status !== "AVAILABLE") return null;
  if (imagesCount === 0) {
    return new ValidationFailure("Para publicar, adicione pelo menos uma screenshot.", {
      images: "Adicione pelo menos uma imagem",
    });
  }
  if (!hasCredentials) {
    return new ValidationFailure("Para publicar, preencha os dados privados (login e senha).", {
      "credentials.login": "Obrigatório para publicar",
      "credentials.password": "Obrigatório para publicar",
    });
  }
  return null;
}

function publicFields(data: ReturnType<typeof accountInputSchema.parse>) {
  return {
    title: data.title,
    description: data.description,
    priceCents: data.priceCents,
    level: data.level,
    server: data.server,
    accountYear: data.accountYear,
    skins: data.skins,
    evolutionWeapons: data.evolutionWeapons,
    emotes: data.emotes,
    characters: data.characters,
    passes: data.passes,
    highlights: data.highlights,
    observations: data.observations,
    adminNotes: data.adminNotes,
    featured: data.featured,
  };
}

function toResult(error: unknown): AdminResult<never> {
  if (error instanceof ValidationFailure) {
    const fieldErrors = Object.fromEntries(
      Object.entries(error.fieldErrors ?? {}).filter(([, message]) => message),
    );
    return { ok: false, error: error.message, fieldErrors };
  }
  throw error;
}

export async function createAccount(raw: AccountInput): Promise<AdminResult<{ id: string }>> {
  const valid = validate(raw);
  if (valid instanceof ValidationFailure) return toResult(valid);
  const { data, credentials } = valid;

  const blocked = publishRequirements(data.status, data.images.length, credentials !== null);
  if (blocked) return toResult(blocked);

  const id = await getDb().transaction(async (tx) => {
    const [created] = await tx
      .insert(accounts)
      .values({
        ...publicFields(data),
        status: data.status,
        publishedAt: data.status === "AVAILABLE" ? new Date() : null,
      })
      .returning({ id: accounts.id });
    if (!created) throw new Error("Falha ao criar conta");

    await syncImages(tx, created.id, data.images);
    if (credentials) {
      await tx
        .insert(accountCredentials)
        .values({ accountId: created.id, ...encryptCredentials(created.id, credentials) });
    }
    return created.id;
  });

  return { ok: true, data: { id } };
}

export async function updateAccount(
  id: string,
  raw: AccountInput,
): Promise<AdminResult<{ id: string }>> {
  if (!UUID.test(id)) return { ok: false, error: "Conta não encontrada." };
  const valid = validate(raw);
  if (valid instanceof ValidationFailure) return toResult(valid);
  const { data, credentials } = valid;

  let removed: string[] = [];
  try {
    await getDb().transaction(async (tx) => {
      // Bloqueia a linha: o checkout não pode reservar a meio desta edição.
      const [current] = await tx
        .select({ status: accounts.status, priceCents: accounts.priceCents })
        .from(accounts)
        .where(eq(accounts.id, id))
        .for("update");
      if (!current) throw new ValidationFailure("Conta não encontrada.");

      const locked = LOCKED.includes(current.status);
      if (locked && data.priceCents !== current.priceCents) {
        throw new ValidationFailure(
          "Não é possível alterar o preço de uma conta reservada ou vendida.",
          { priceCents: "Preço bloqueado" },
        );
      }

      const [existingCreds] = await tx
        .select({ accountId: accountCredentials.accountId })
        .from(accountCredentials)
        .where(eq(accountCredentials.accountId, id));
      const hasCredentials = credentials !== null || Boolean(existingCreds);

      if (!locked) {
        const blocked = publishRequirements(data.status, data.images.length, hasCredentials);
        if (blocked) throw blocked;
      }

      await tx
        .update(accounts)
        .set({
          ...publicFields(data),
          // RESERVED/SOLD nunca são alterados pelo admin.
          ...(locked ? {} : { status: data.status }),
          ...(!locked && data.status === "AVAILABLE"
            ? { publishedAt: sql`coalesce(${accounts.publishedAt}, now())` }
            : {}),
        })
        .where(eq(accounts.id, id));

      removed = await syncImages(tx, id, data.images);

      if (credentials) {
        const encrypted = encryptCredentials(id, credentials);
        await tx
          .insert(accountCredentials)
          .values({ accountId: id, ...encrypted })
          .onConflictDoUpdate({ target: accountCredentials.accountId, set: encrypted });
      }
    });
  } catch (error) {
    return toResult(error);
  }

  await destroyUnused(removed);
  return { ok: true, data: { id } };
}

export async function deleteAccount(id: string): Promise<AdminResult> {
  if (!UUID.test(id)) return { ok: false, error: "Conta não encontrada." };
  const db = getDb();

  let removed: string[] = [];
  try {
    await db.transaction(async (tx) => {
      const [ordersRow] = await tx
        .select({ n: count() })
        .from(orders)
        .where(eq(orders.accountId, id));
      if ((ordersRow?.n ?? 0) > 0) {
        throw new ValidationFailure(
          "Esta conta tem pedidos associados e não pode ser excluída. Desative-a em vez disso.",
        );
      }
      const images = await tx
        .delete(accountImages)
        .where(eq(accountImages.accountId, id))
        .returning({ publicId: accountImages.publicId });
      removed = images.map((image) => image.publicId);
      const deleted = await tx
        .delete(accounts)
        .where(eq(accounts.id, id))
        .returning({ id: accounts.id });
      if (deleted.length === 0) throw new ValidationFailure("Conta não encontrada.");
    });
  } catch (error) {
    return toResult(error);
  }

  await destroyUnused(removed);
  return { ok: true, data: null };
}

/** Só para o admin confirmar o que guardou. Não é a entrega ao comprador. */
export async function revealAccountCredentials(id: string): Promise<AccountCredentials | null> {
  if (!UUID.test(id)) return null;
  const [row] = await getDb()
    .select()
    .from(accountCredentials)
    .where(eq(accountCredentials.accountId, id));
  return row ? decryptCredentials(id, row) : null;
}
