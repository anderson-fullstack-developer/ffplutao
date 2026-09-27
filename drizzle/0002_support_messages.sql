CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"from_admin" boolean NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_messages_body_not_empty" CHECK (length(trim("support_messages"."body")) > 0)
);
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "awaiting_admin" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "last_message_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_messages_ticket_idx" ON "support_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_inbox_idx" ON "support_tickets" USING btree ("awaiting_admin","status","last_message_at");