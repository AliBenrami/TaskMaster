CREATE TYPE "public"."note_source" AS ENUM('manual', 'upload');--> statement-breakpoint
CREATE TABLE "embedding" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(768) NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
ALTER TABLE "parse_test_runs" DROP CONSTRAINT "parse_test_runs_scope_unique";--> statement-breakpoint
ALTER TABLE "parse_test_course" ADD COLUMN "course_section" text;--> statement-breakpoint
ALTER TABLE "parse_test_course" ADD COLUMN "required_materials" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "parse_test_course" ADD COLUMN "homework_tools" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "parse_test_runs" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "embedding" ADD CONSTRAINT "embedding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embedding_user_source_idx" ON "embedding" USING btree ("user_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "embedding_hash_idx" ON "embedding" USING btree ("user_id","source_type","source_id","content_hash");--> statement-breakpoint
CREATE INDEX "embedding_hnsw_idx" ON "embedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "note_userId_idx" ON "note" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "note_createdAt_idx" ON "note" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "parse_test_runs" ADD CONSTRAINT "parse_test_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parse_test_runs_user_id_idx" ON "parse_test_runs" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "parse_test_runs" DROP COLUMN "scope";