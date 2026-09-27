import { z } from "zod";

import { SERVERS } from "./catalog";

/** Tipos e validação do painel de admin (partilhados entre cliente e servidor). */

/** Estados que o admin pode escolher. RESERVED e SOLD só mudam pelo fluxo de pagamento. */
export const ADMIN_STATUSES = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "AVAILABLE", label: "Publicada" },
  { value: "DISABLED", label: "Desativada" },
] as const;

export type AdminEditableStatus = (typeof ADMIN_STATUSES)[number]["value"];
export type AccountStatus = "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "DISABLED";
export type OrderStatus = "PENDING" | "PAID" | "CANCELLED" | "FAILED" | "REFUNDED";

export const HIGHLIGHTS = [
  "Skins raras",
  "Armas evolutivas",
  "Passes antigos",
  "Emotes raros",
  "Itens de coleção",
  "Boa para começar",
  "Entrada acessível",
  "Conta equilibrada",
] as const;

export const MAX_IMAGES = 12;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;

export const accountImageSchema = z.object({
  publicId: z.string().min(1).max(255),
  url: z.string().url().max(1000),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});

export type AccountImageInput = z.infer<typeof accountImageSchema>;

const count = (label: string) =>
  z
    .number({ invalid_type_error: `${label}: indique um número` })
    .int(`${label}: tem de ser um número inteiro`)
    .min(0, `${label}: não pode ser negativo`)
    .max(100_000, `${label}: valor demasiado alto`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((value) => (value === "" ? null : value))
    .nullable();

export const credentialsInputSchema = z.object({
  login: z.string().trim().max(200),
  password: z.string().max(200),
  recoveryEmail: z.string().trim().max(254),
  instructions: z.string().trim().max(2000),
});

export const accountInputSchema = z.object({
  title: z.string().trim().min(3, "Título demasiado curto").max(120, "Título demasiado longo"),
  description: z.string().trim().max(5000, "Descrição demasiado longa"),
  priceCents: z
    .number({ invalid_type_error: "Indique o preço" })
    .int()
    .min(100, "O preço mínimo é €1,00")
    .max(10_000_000, "Preço demasiado alto"),
  level: z
    .number({ invalid_type_error: "Indique o level" })
    .int()
    .min(1, "Level mínimo: 1")
    .max(100, "Level máximo: 100"),
  server: z.enum(SERVERS, { errorMap: () => ({ message: "Escolha um servidor" }) }),
  accountYear: z
    .number()
    .int()
    .min(2017, "O Free Fire foi lançado em 2017")
    .refine((year) => year <= new Date().getFullYear(), "Ano no futuro")
    .nullable(),
  skins: count("Skins"),
  evolutionWeapons: count("Armas evolutivas"),
  emotes: count("Emotes"),
  characters: count("Personagens"),
  passes: count("Passes"),
  highlights: z.array(z.enum(HIGHLIGHTS)).max(HIGHLIGHTS.length),
  observations: optionalText(2000),
  adminNotes: optionalText(5000),
  featured: z.boolean(),
  status: z.enum(["DRAFT", "AVAILABLE", "DISABLED"]),
  images: z.array(accountImageSchema).max(MAX_IMAGES, `Máximo ${MAX_IMAGES} imagens`),
  /** null = manter as credenciais atuais. */
  credentials: credentialsInputSchema.nullable(),
});

export type AccountInput = z.input<typeof accountInputSchema>;

export interface AdminAccountRow {
  id: string;
  title: string;
  level: number;
  server: string;
  priceCents: number;
  status: AccountStatus;
  featured: boolean;
  coverUrl: string | null;
  hasCredentials: boolean;
  ordersCount: number;
  createdAt: string;
}

export interface AdminAccountDetail {
  id: string;
  title: string;
  description: string;
  priceCents: number;
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
  adminNotes: string | null;
  featured: boolean;
  status: AccountStatus;
  reservedUntil: string | null;
  images: AccountImageInput[];
  hasCredentials: boolean;
  ordersCount: number;
}

export interface AdminOrderRow {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  accountId: string;
  accountTitle: string;
  amountCents: number;
  status: OrderStatus;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminCustomerRow {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  purchases: number;
  totalSpentCents: number;
}

export interface AdminDashboard {
  totalSalesCents: number;
  salesLast30Cents: number;
  ordersCount: number;
  paidOrdersCount: number;
  availableCount: number;
  reservedCount: number;
  soldCount: number;
  customersCount: number;
  newCustomers30: number;
  daily: { day: string; cents: number }[];
  recentOrders: AdminOrderRow[];
}

export type AdminResult<T = null> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function orderReference(number: number) {
  return `#PLU-${String(number).padStart(5, "0")}`;
}

/** "69,90" / "69.90" / "€ 69,9" → 6990. Devolve NaN se inválido. */
export function parsePriceToCents(input: string): number {
  const normalized = input.replace(/[€\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return Math.round(Number(normalized) * 100);
}
