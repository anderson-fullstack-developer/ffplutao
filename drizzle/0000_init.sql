CREATE TYPE "public"."account_status" AS ENUM('DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PAID', 'CANCELLED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('OPEN', 'IN_PROGRESS', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "account_credentials" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"key_version" integer NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"ciphertext" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"public_id" text NOT NULL,
	"url" text NOT NULL,
	"width" integer,
	"height" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_images_position_non_negative" CHECK ("account_images"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"level" integer NOT NULL,
	"server" text NOT NULL,
	"account_year" integer,
	"skins" integer DEFAULT 0 NOT NULL,
	"evolution_weapons" integer DEFAULT 0 NOT NULL,
	"emotes" integer DEFAULT 0 NOT NULL,
	"characters" integer DEFAULT 0 NOT NULL,
	"passes" integer DEFAULT 0 NOT NULL,
	"highlights" text[] DEFAULT '{}'::text[] NOT NULL,
	"observations" text,
	"admin_notes" text,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "account_status" DEFAULT 'DRAFT' NOT NULL,
	"reserved_until" timestamp with time zone,
	"published_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_price_positive" CHECK ("accounts"."price_cents" > 0),
	CONSTRAINT "accounts_counts_non_negative" CHECK ("accounts"."level" >= 0 and "accounts"."skins" >= 0 and "accounts"."evolution_weapons" >= 0 and "accounts"."emotes" >= 0 and "accounts"."characters" >= 0 and "accounts"."passes" >= 0),
	CONSTRAINT "accounts_reservation_consistency" CHECK (("accounts"."status" = 'RESERVED') = ("accounts"."reserved_until" is not null)),
	CONSTRAINT "accounts_sold_consistency" CHECK ("accounts"."status" <> 'SOLD' or "accounts"."sold_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "credential_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "orders_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"payment_provider" text DEFAULT 'stripe' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"reservation_expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_unique" UNIQUE("number"),
	CONSTRAINT "orders_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id"),
	CONSTRAINT "orders_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "orders_amount_positive" CHECK ("orders"."amount_cents" > 0),
	CONSTRAINT "orders_paid_consistency" CHECK ("orders"."status" <> 'PAID' or "orders"."paid_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "support_tickets_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" "ticket_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_credentials" ADD CONSTRAINT "account_credentials_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_images" ADD CONSTRAINT "account_images_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_access_logs" ADD CONSTRAINT "credential_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_access_logs" ADD CONSTRAINT "credential_access_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_images_account_position_idx" ON "account_images" USING btree ("account_id","position");--> statement-breakpoint
CREATE INDEX "accounts_status_created_idx" ON "accounts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "accounts_status_price_idx" ON "accounts" USING btree ("status","price_cents");--> statement-breakpoint
CREATE INDEX "credential_access_logs_order_idx" ON "credential_access_logs" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "credential_access_logs_user_idx" ON "credential_access_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_one_paid_per_account_uq" ON "orders" USING btree ("account_id") WHERE "orders"."status" = 'PAID';--> statement-breakpoint
CREATE UNIQUE INDEX "orders_one_pending_per_account_uq" ON "orders" USING btree ("account_id") WHERE "orders"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "orders_user_created_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_user_idx" ON "support_tickets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));