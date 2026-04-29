ALTER TABLE "note" ADD COLUMN "class_id" text;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_class_id_parse_test_course_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."parse_test_course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_class_id_idx" ON "note" USING btree ("class_id");
