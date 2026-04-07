CREATE TABLE "parse_test_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"date_text" text NOT NULL,
	"due_at" timestamp with time zone,
	"time_text" text,
	"weight_percent" double precision,
	"source_snippet" text NOT NULL,
	"confidence" double precision NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parse_test_concepts" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"label" text NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parse_test_course" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"title" text NOT NULL,
	"course_code" text,
	"term" text,
	"instructor_name" text,
	"meeting_days" text,
	"meeting_time" text,
	"meeting_location" text,
	"catalog_description" text,
	"student_summary" text NOT NULL,
	"description_source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parse_test_course_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "parse_test_grading_items" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"label" text NOT NULL,
	"weight_percent" double precision NOT NULL,
	"source_snippet" text NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parse_test_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text DEFAULT 'global' NOT NULL,
	"content_hash" text NOT NULL,
	"original_file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"parse_status" text DEFAULT 'processing' NOT NULL,
	"parse_model" text NOT NULL,
	"gemini_file_uri" text,
	"warnings" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parse_test_runs_scope_unique" UNIQUE("scope")
);
--> statement-breakpoint
ALTER TABLE "parse_test_assignments" ADD CONSTRAINT "parse_test_assignments_course_id_parse_test_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."parse_test_course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parse_test_concepts" ADD CONSTRAINT "parse_test_concepts_course_id_parse_test_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."parse_test_course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parse_test_course" ADD CONSTRAINT "parse_test_course_run_id_parse_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."parse_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parse_test_grading_items" ADD CONSTRAINT "parse_test_grading_items_course_id_parse_test_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."parse_test_course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parse_test_assignments_course_id_idx" ON "parse_test_assignments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "parse_test_assignments_due_at_idx" ON "parse_test_assignments" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "parse_test_concepts_course_id_idx" ON "parse_test_concepts" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "parse_test_course_run_id_idx" ON "parse_test_course" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "parse_test_grading_items_course_id_idx" ON "parse_test_grading_items" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "parse_test_runs_content_hash_idx" ON "parse_test_runs" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "parse_test_runs_status_idx" ON "parse_test_runs" USING btree ("parse_status");