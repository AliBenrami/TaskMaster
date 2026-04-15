CREATE TABLE "docling_test_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content_hash" text NOT NULL,
	"original_file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"input_format" text NOT NULL,
	"parse_status" text DEFAULT 'processing' NOT NULL,
	"provider" text NOT NULL,
	"provider_version" text,
	"backend" text NOT NULL,
	"warnings" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docling_test_course" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"title" text NOT NULL,
	"course_code" text,
	"course_section" text,
	"term" text,
	"instructor_name" text,
	"meeting_days" text,
	"meeting_time" text,
	"meeting_location" text,
	"required_materials" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"homework_tools" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"catalog_description" text,
	"student_summary" text NOT NULL,
	"description_source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "docling_test_course_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "docling_test_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"date_text" text NOT NULL,
	"due_at" timestamp with time zone,
	"time_text" text,
	"weight_percent" double precision,
	"source_snippet" text NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docling_test_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"office_hours" text,
	"location" text,
	"source_snippet" text NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docling_test_events" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"date_text" text NOT NULL,
	"due_at" timestamp with time zone,
	"time_text" text,
	"location" text,
	"source_snippet" text NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docling_test_grading_items" (
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
CREATE TABLE "docling_test_concepts" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"label" text NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docling_test_artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"markdown" text NOT NULL,
	"raw_json" jsonb NOT NULL,
	"stats" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "docling_test_artifacts_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
ALTER TABLE "docling_test_runs" ADD CONSTRAINT "docling_test_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "docling_test_course" ADD CONSTRAINT "docling_test_course_run_id_docling_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."docling_test_runs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "docling_test_assignments" ADD CONSTRAINT "docling_test_assignments_course_id_docling_test_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."docling_test_course"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "docling_test_contacts" ADD CONSTRAINT "docling_test_contacts_course_id_docling_test_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."docling_test_course"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "docling_test_events" ADD CONSTRAINT "docling_test_events_course_id_docling_test_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."docling_test_course"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "docling_test_grading_items" ADD CONSTRAINT "docling_test_grading_items_course_id_docling_test_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."docling_test_course"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "docling_test_concepts" ADD CONSTRAINT "docling_test_concepts_course_id_docling_test_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."docling_test_course"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "docling_test_artifacts" ADD CONSTRAINT "docling_test_artifacts_run_id_docling_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."docling_test_runs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "docling_test_runs_user_id_idx" ON "docling_test_runs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "docling_test_runs_content_hash_idx" ON "docling_test_runs" USING btree ("content_hash");
--> statement-breakpoint
CREATE INDEX "docling_test_runs_status_idx" ON "docling_test_runs" USING btree ("parse_status");
--> statement-breakpoint
CREATE INDEX "docling_test_course_run_id_idx" ON "docling_test_course" USING btree ("run_id");
--> statement-breakpoint
CREATE INDEX "docling_test_assignments_course_id_idx" ON "docling_test_assignments" USING btree ("course_id");
--> statement-breakpoint
CREATE INDEX "docling_test_assignments_due_at_idx" ON "docling_test_assignments" USING btree ("due_at");
--> statement-breakpoint
CREATE INDEX "docling_test_contacts_course_id_idx" ON "docling_test_contacts" USING btree ("course_id");
--> statement-breakpoint
CREATE INDEX "docling_test_events_course_id_idx" ON "docling_test_events" USING btree ("course_id");
--> statement-breakpoint
CREATE INDEX "docling_test_events_due_at_idx" ON "docling_test_events" USING btree ("due_at");
--> statement-breakpoint
CREATE INDEX "docling_test_grading_items_course_id_idx" ON "docling_test_grading_items" USING btree ("course_id");
--> statement-breakpoint
CREATE INDEX "docling_test_concepts_course_id_idx" ON "docling_test_concepts" USING btree ("course_id");
--> statement-breakpoint
CREATE INDEX "docling_test_artifacts_run_id_idx" ON "docling_test_artifacts" USING btree ("run_id");
