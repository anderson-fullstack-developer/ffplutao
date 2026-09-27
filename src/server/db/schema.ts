import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ============================================================
// Enums — espelham os estados definidos em plano.md
// ============================================================

export const userRole = pgEnum("user_role", ["USER", "ADMIN"]);

export const accountStatus = pgEnum("account_status", [
  "DRAFT",
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "DISABLED",
]);

export const orderStatus = pgEnum("order_status", [
  "PENDING",
  "PAID",
  "CANCELLED",
  "FAILED",
  "REFUNDED",
]);

export const ticketStatus = pgEnum("ticket_status", ["OPEN", "IN_PROGRESS", "CLOSED"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ============================================================
// Utilizadores
// ============================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    /** Hash Argon2 — a senha do utilizador nunca é recuperável. */
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("USER"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`)],
);

// ============================================================
// Sessões (cookie com token opaco; aqui só fica o SHA-256 do token)
// ============================================================

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 (hex) do token do cookie. O token em si nunca é guardado. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

// ============================================================
// Limite de tentativas (login/registo) — partilhado entre instâncias serverless
// ============================================================

export const authRateLimits = pgTable("auth_rate_limits", {
  /** Ex.: "login:email:joao@x.pt", "login:ip:1.2.3.4" */
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

// ============================================================
// Contas de jogo (produtos) — só dados PÚBLICOS nesta tabela
// ============================================================

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** Preço em cêntimos (6990 = €69,90). Nunca usar float para dinheiro. */
    priceCents: integer("price_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    level: integer("level").notNull(),
    server: text("server").notNull(),
    accountYear: integer("account_year"),
    skins: integer("skins").notNull().default(0),
    evolutionWeapons: integer("evolution_weapons").notNull().default(0),
    emotes: integer("emotes").notNull().default(0),
    characters: integer("characters").notNull().default(0),
    passes: integer("passes").notNull().default(0),
    highlights: text("highlights")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Observações públicas, visíveis no anúncio. */
    observations: text("observations"),
    /** Notas internas, só para o admin. */
    adminNotes: text("admin_notes"),
    featured: boolean("featured").notNull().default(false),
    status: accountStatus("status").notNull().default("DRAFT"),
    /** Preenchido apenas enquanto status = RESERVED. */
    reservedUntil: timestamp("reserved_until", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("accounts_price_positive", sql`${t.priceCents} > 0`),
    check(
      "accounts_counts_non_negative",
      sql`${t.level} >= 0 and ${t.skins} >= 0 and ${t.evolutionWeapons} >= 0 and ${t.emotes} >= 0 and ${t.characters} >= 0 and ${t.passes} >= 0`,
    ),
    // RESERVED ⇔ reserved_until preenchido. Impede reservas "sem prazo".
    check(
      "accounts_reservation_consistency",
      sql`(${t.status} = 'RESERVED') = (${t.reservedUntil} is not null)`,
    ),
    check("accounts_sold_consistency", sql`${t.status} <> 'SOLD' or ${t.soldAt} is not null`),
    index("accounts_status_created_idx").on(t.status, t.createdAt),
    index("accounts_status_price_idx").on(t.status, t.priceCents),
  ],
);

export const accountImages = pgTable(
  "account_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** public_id no Cloudinary (necessário para apagar a imagem lá). */
    publicId: text("public_id").notNull(),
    url: text("url").notNull(),
    width: integer("width"),
    height: integer("height"),
    /** 0 = imagem principal. */
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    check("account_images_position_non_negative", sql`${t.position} >= 0`),
    index("account_images_account_position_idx").on(t.accountId, t.position),
  ],
);

// ============================================================
// Credenciais — tabela separada, sempre encriptada (AES-256-GCM)
// Só é lida pela rota de revelação, depois de validar ownership + pagamento.
// ============================================================

export const accountCredentials = pgTable("account_credentials", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accounts.id, { onDelete: "cascade" }),
  keyVersion: integer("key_version").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  ciphertext: text("ciphertext").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ============================================================
// Pedidos
// ============================================================

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Número sequencial para a referência visível (#PLU-00001). */
    number: integer("number").notNull().unique().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    /** Copiado do preço da conta na base de dados no momento da compra. */
    amountCents: integer("amount_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    status: orderStatus("status").notNull().default("PENDING"),
    paymentProvider: text("payment_provider").notNull().default("stripe"),
    /** Pedidos pagos juntos (carrinho) partilham o mesmo grupo e a mesma sessão de pagamento. */
    checkoutGroupId: uuid("checkout_group_id").notNull().defaultRandom(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    /** Partilhado pelos pedidos pagos juntos (carrinho). */
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    reservationExpiresAt: timestamp("reservation_expires_at", { withTimezone: true }).notNull(),
    /** Quando o cliente aceitou os Termos e a entrega imediata (perda da livre resolução). */
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("orders_amount_positive", sql`${t.amountCents} > 0`),
    check("orders_paid_consistency", sql`${t.status} <> 'PAID' or ${t.paidAt} is not null`),
    // REGRA PRINCIPAL: nunca duas orders PAID para a mesma conta.
    uniqueIndex("orders_one_paid_per_account_uq")
      .on(t.accountId)
      .where(sql`${t.status} = 'PAID'`),
    // Nunca dois checkouts em curso para a mesma conta.
    uniqueIndex("orders_one_pending_per_account_uq")
      .on(t.accountId)
      .where(sql`${t.status} = 'PENDING'`),
    index("orders_user_created_idx").on(t.userId, t.createdAt),
    index("orders_status_created_idx").on(t.status, t.createdAt),
    index("orders_checkout_group_idx").on(t.checkoutGroupId),
    index("orders_stripe_session_idx").on(t.stripeCheckoutSessionId),
    index("orders_stripe_payment_intent_idx").on(t.stripePaymentIntentId),
  ],
);

// ============================================================
// Idempotência dos webhooks Stripe
// ============================================================

export const stripeEvents = pgTable("stripe_events", {
  /** ID do evento Stripe (evt_...). PK = impossível processar o mesmo evento duas vezes. */
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// Auditoria de acesso às credenciais
// ============================================================

export const credentialAccessLogs = pgTable(
  "credential_access_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [
    index("credential_access_logs_order_idx").on(t.orderId, t.createdAt),
    index("credential_access_logs_user_idx").on(t.userId, t.createdAt),
  ],
);

// ============================================================
// Suporte
// ============================================================

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: integer("number").notNull().unique().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    status: ticketStatus("status").notNull().default("OPEN"),
    /** true quando a última mensagem é do cliente (o admin tem de responder). */
    awaitingAdmin: boolean("awaiting_admin").notNull().default(true),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("support_tickets_user_idx").on(t.userId, t.createdAt),
    index("support_tickets_status_idx").on(t.status, t.createdAt),
    index("support_tickets_inbox_idx").on(t.awaitingAdmin, t.status, t.lastMessageAt),
  ],
);

/** Conversa de um ticket (a primeira mensagem é a do cliente ao abrir o ticket). */
export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Resposta da equipa (admin) ou do cliente. */
    fromAdmin: boolean("from_admin").notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check("support_messages_body_not_empty", sql`length(trim(${t.body})) > 0`),
    index("support_messages_ticket_idx").on(t.ticketId, t.createdAt),
  ],
);
