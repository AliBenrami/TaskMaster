CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE "note" ADD COLUMN IF NOT EXISTS "embedding" vector(768);
