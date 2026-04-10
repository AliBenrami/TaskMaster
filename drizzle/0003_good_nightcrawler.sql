CREATE TABLE "parse_test_contacts" (
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
CREATE TABLE "parse_test_events" (
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
ALTER TABLE "parse_test_contacts" ADD CONSTRAINT "parse_test_contacts_course_id_parse_test_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."parse_test_course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parse_test_events" ADD CONSTRAINT "parse_test_events_course_id_parse_test_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."parse_test_course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parse_test_contacts_course_id_idx" ON "parse_test_contacts" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "parse_test_events_course_id_idx" ON "parse_test_events" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "parse_test_events_due_at_idx" ON "parse_test_events" USING btree ("due_at");