DROP INDEX IF EXISTS "parse_test_runs_user_id_idx";
--> statement-breakpoint
CREATE INDEX "parse_test_runs_user_id_idx" ON "parse_test_runs" USING btree ("user_id");
