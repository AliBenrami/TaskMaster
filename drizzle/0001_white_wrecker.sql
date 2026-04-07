CREATE TYPE "public"."note_source" AS ENUM('manual', 'upload');--> statement-breakpoint
CREATE TABLE "note" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"content" jsonb,
	"source_type" "note_source" DEFAULT 'manual' NOT NULL,
	"file_url" text,
	"file_name" text,
	"mime_type" text,
	"file_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_userId_idx" ON "note" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "note_createdAt_idx" ON "note" USING btree ("created_at");