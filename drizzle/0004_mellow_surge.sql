DELETE FROM "parse_test_runs";
--> statement-breakpoint
ALTER TABLE "parse_test_runs" DROP CONSTRAINT "parse_test_runs_scope_unique";
--> statement-breakpoint
ALTER TABLE "parse_test_runs" ADD COLUMN "user_id" text;
--> statement-breakpoint
ALTER TABLE "parse_test_runs" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "parse_test_runs" ADD CONSTRAINT "parse_test_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "parse_test_runs" DROP COLUMN "scope";
--> statement-breakpoint
ALTER TABLE "parse_test_course" ADD COLUMN "course_section" text;
--> statement-breakpoint
ALTER TABLE "parse_test_course" ADD COLUMN "required_materials" text[] DEFAULT ARRAY[]::text[] NOT NULL;
--> statement-breakpoint
ALTER TABLE "parse_test_course" ADD COLUMN "homework_tools" text[] DEFAULT ARRAY[]::text[] NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "parse_test_runs_user_id_idx" ON "parse_test_runs" USING btree ("user_id");
