ALTER TABLE "orders" DROP CONSTRAINT "orders_stripe_checkout_session_id_unique";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_group_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE INDEX "orders_checkout_group_idx" ON "orders" USING btree ("checkout_group_id");--> statement-breakpoint
CREATE INDEX "orders_stripe_session_idx" ON "orders" USING btree ("stripe_checkout_session_id");