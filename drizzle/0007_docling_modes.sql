ALTER TABLE "docling_test_runs" ADD COLUMN "mode" text DEFAULT 'syllabus' NOT NULL;
--> statement-breakpoint
CREATE INDEX "docling_test_runs_mode_idx" ON "docling_test_runs" USING btree ("mode");
