CREATE TABLE IF NOT EXISTS "flashcards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"source_note_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"cards" jsonb NOT NULL,
	"card_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flashcards_user_id_idx" ON "flashcards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flashcards_created_at_idx" ON "flashcards" USING btree ("created_at");
