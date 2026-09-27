import { z } from "zod";

/**
 * Tipos e filtros PÚBLICOS do catálogo (partilhados entre cliente e servidor).
 * Nada aqui pode conter dados privados (credenciais, notas internas).
 */

export type PublicAccountStatus = "AVAILABLE" | "RESERVED" | "SOLD";

export interface PublicImage {
  url: string;
  thumbUrl: string;
  width: number | null;
  height: number | null;
}

export interface PublicAccount {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  level: number;
  server: string;
  accountYear: number | null;
  skins: number;
  evolutionWeapons: number;
  emotes: number;
  characters: number;
  passes: number;
  highlights: string[];
  observations: string | null;
  featured: boolean;
  status: PublicAccountStatus;
  images: PublicImage[];
  publishedAt: string | null;
}

/** Servidores (regiões) do Free Fire. Ordem = ordem nos formulários e filtros. */
export const SERVERS = [
  "Brasil",
  "Europa",
  "América Latina",
  "América do Norte",
  "África e o Oriente Médio",
  "Rússia e CEI",
  "Índia",
  "Paquistão",
  "Bangladesh",
  "Indonésia",
  "Tailândia",
  "Vietname",
  "Singapura",
  "Taiwan",
] as const;

export type GameServer = (typeof SERVERS)[number];

export const PRICE_RANGES = [
  { value: "todos", label: "Todos", min: null, max: null },
  { value: "0-25", label: "Até €25", min: 0, max: 2500 },
  { value: "25-50", label: "€25 - €50", min: 2500, max: 5000 },
  { value: "50-100", label: "€50 - €100", min: 5000, max: 10000 },
  { value: "100+", label: "€100+", min: 10000, max: null },
] as const;

export const LEVEL_RANGES = [
  { value: "todos", label: "Todos", min: null, max: null },
  { value: "1-30", label: "1 - 30", min: 1, max: 30 },
  { value: "31-50", label: "31 - 50", min: 31, max: 50 },
  { value: "51-70", label: "51 - 70", min: 51, max: 70 },
  { value: "70+", label: "70+", min: 71, max: null },
] as const;

export const FEATURES = [
  { value: "evolutivas", label: "Armas evolutivas" },
  { value: "skins", label: "Skins raras" },
  { value: "emotes", label: "Emotes raros" },
  { value: "passes", label: "Passes antigos" },
  { value: "colecao", label: "Itens de coleção" },
] as const;

export const SORTS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "menor", label: "Menor preço" },
  { value: "maior", label: "Maior preço" },
  { value: "nivel", label: "Maior nível" },
] as const;

export const PAGE_SIZE = 12;

type Values<T extends readonly { value: string }[]> = T[number]["value"];
const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((item) => item.value) as [Values<T>, ...Values<T>[]];

/** Filtros do catálogo, validados no URL (/contas?...) e outra vez no servidor. */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  preco: z.enum(values(PRICE_RANGES)).optional().catch(undefined),
  nivel: z.enum(values(LEVEL_RANGES)).optional().catch(undefined),
  servidor: z.array(z.enum(SERVERS)).max(SERVERS.length).optional().catch(undefined),
  carac: z
    .array(z.enum(values(FEATURES)))
    .max(FEATURES.length)
    .optional()
    .catch(undefined),
  ordem: z.enum(values(SORTS)).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});

export type CatalogSearch = z.infer<typeof catalogSearchSchema>;

export interface CatalogPage {
  items: PublicAccount[];
  total: number;
  page: number;
  pageCount: number;
}

export const centsToEuros = (cents: number) => cents / 100;
