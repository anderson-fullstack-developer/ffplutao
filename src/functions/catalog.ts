import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { catalogSearchSchema, type CatalogSearch } from "@/lib/catalog";
import {
  getCartAccounts,
  getFeatured,
  getPublicAccount,
  listCatalog,
} from "@/server/catalog/queries";

// Funções públicas (sem login). Devolvem apenas dados públicos das contas.

export const listCatalogFn = createServerFn({ method: "GET" })
  .validator((data: CatalogSearch) => catalogSearchSchema.parse(data))
  .handler(async ({ data }) => listCatalog(data));

export const getFeaturedFn = createServerFn({ method: "GET" }).handler(async () => getFeatured());

export const getPublicAccountFn = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => z.object({ id: z.string().max(64) }).parse(data))
  .handler(async ({ data }) => getPublicAccount(data.id));

/** Dados atuais das contas do carrinho (o carrinho em si fica guardado no browser). */
export const getCartAccountsFn = createServerFn({ method: "GET" })
  .validator((data: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().max(64)).max(20) }).parse(data),
  )
  .handler(async ({ data }) => getCartAccounts(data.ids));
