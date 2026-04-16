import { relations, sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const parseTestRun = pgTable(
  "parse_test_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    originalFileName: text("original_file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    parseStatus: text("parse_status", {
      enum: ["processing", "completed", "failed"],
    })
      .notNull()
      .default("processing"),
    parseModel: text("parse_model").notNull(),
    geminiFileUri: text("gemini_file_uri"),
    warnings: text("warnings")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("parse_test_runs_user_id_idx").on(table.userId),
    index("parse_test_runs_content_hash_idx").on(table.contentHash),
    index("parse_test_runs_status_idx").on(table.parseStatus),
  ],
);

export const parseTestCourse = pgTable(
  "parse_test_course",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => parseTestRun.id, { onDelete: "cascade" })
      .unique(),
    title: text("title").notNull(),
    courseCode: text("course_code"),
    courseSection: text("course_section"),
    term: text("term"),
    instructorName: text("instructor_name"),
    meetingDays: text("meeting_days"),
    meetingTime: text("meeting_time"),
    meetingLocation: text("meeting_location"),
    requiredMaterials: text("required_materials")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    homeworkTools: text("homework_tools")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    catalogDescription: text("catalog_description"),
    studentSummary: text("student_summary").notNull(),
    descriptionSource: text("description_source", {
      enum: [
        "catalog_description",
        "course_objectives",
        "learning_outcomes",
        "inferred_from_topics",
      ],
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("parse_test_course_run_id_idx").on(table.runId)],
);

export const parseTestAssignment = pgTable(
  "parse_test_assignments",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => parseTestCourse.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    dateText: text("date_text").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    timeText: text("time_text"),
    weightPercent: doublePrecision("weight_percent"),
    sourceSnippet: text("source_snippet").notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("parse_test_assignments_course_id_idx").on(table.courseId),
    index("parse_test_assignments_due_at_idx").on(table.dueAt),
  ],
);

export const parseTestContact = pgTable(
  "parse_test_contacts",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => parseTestCourse.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    officeHours: text("office_hours"),
    location: text("location"),
    sourceSnippet: text("source_snippet").notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("parse_test_contacts_course_id_idx").on(table.courseId)],
);

export const parseTestEvent = pgTable(
  "parse_test_events",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => parseTestCourse.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    dateText: text("date_text").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    timeText: text("time_text"),
    location: text("location"),
    sourceSnippet: text("source_snippet").notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("parse_test_events_course_id_idx").on(table.courseId),
    index("parse_test_events_due_at_idx").on(table.dueAt),
  ],
);

export const parseTestGradingItem = pgTable(
  "parse_test_grading_items",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => parseTestCourse.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    weightPercent: doublePrecision("weight_percent").notNull(),
    sourceSnippet: text("source_snippet").notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("parse_test_grading_items_course_id_idx").on(table.courseId)],
);

export const parseTestConcept = pgTable(
  "parse_test_concepts",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => parseTestCourse.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("parse_test_concepts_course_id_idx").on(table.courseId)],
);

export const doclingTestRun = pgTable(
  "docling_test_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    originalFileName: text("original_file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    mode: text("mode").notNull().default("syllabus"),
    inputFormat: text("input_format").notNull(),
    parseStatus: text("parse_status", {
      enum: ["processing", "completed", "failed"],
    })
      .notNull()
      .default("processing"),
    provider: text("provider").notNull(),
    providerVersion: text("provider_version"),
    backend: text("backend").notNull(),
    warnings: text("warnings")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("docling_test_runs_user_id_idx").on(table.userId),
    index("docling_test_runs_content_hash_idx").on(table.contentHash),
    index("docling_test_runs_status_idx").on(table.parseStatus),
  ],
);

export const doclingTestCourse = pgTable(
  "docling_test_course",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => doclingTestRun.id, { onDelete: "cascade" })
      .unique(),
    title: text("title").notNull(),
    courseCode: text("course_code"),
    courseSection: text("course_section"),
    term: text("term"),
    instructorName: text("instructor_name"),
    meetingDays: text("meeting_days"),
    meetingTime: text("meeting_time"),
    meetingLocation: text("meeting_location"),
    requiredMaterials: text("required_materials")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    homeworkTools: text("homework_tools")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    catalogDescription: text("catalog_description"),
    studentSummary: text("student_summary").notNull(),
    descriptionSource: text("description_source", {
      enum: [
        "catalog_description",
        "course_objectives",
        "learning_outcomes",
        "inferred_from_topics",
      ],
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("docling_test_course_run_id_idx").on(table.runId)],
);

export const doclingTestAssignment = pgTable(
  "docling_test_assignments",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => doclingTestCourse.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    dateText: text("date_text").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    timeText: text("time_text"),
    weightPercent: doublePrecision("weight_percent"),
    sourceSnippet: text("source_snippet").notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("docling_test_assignments_course_id_idx").on(table.courseId),
    index("docling_test_assignments_due_at_idx").on(table.dueAt),
  ],
);

export const doclingTestContact = pgTable(
  "docling_test_contacts",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => doclingTestCourse.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    officeHours: text("office_hours"),
    location: text("location"),
    sourceSnippet: text("source_snippet").notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("docling_test_contacts_course_id_idx").on(table.courseId)],
);

export const doclingTestEvent = pgTable(
  "docling_test_events",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => doclingTestCourse.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    dateText: text("date_text").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    timeText: text("time_text"),
    location: text("location"),
    sourceSnippet: text("source_snippet").notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("docling_test_events_course_id_idx").on(table.courseId),
    index("docling_test_events_due_at_idx").on(table.dueAt),
  ],
);

export const doclingTestGradingItem = pgTable(
  "docling_test_grading_items",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => doclingTestCourse.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    weightPercent: doublePrecision("weight_percent").notNull(),
    sourceSnippet: text("source_snippet").notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("docling_test_grading_items_course_id_idx").on(table.courseId)],
);

export const doclingTestConcept = pgTable(
  "docling_test_concepts",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => doclingTestCourse.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("docling_test_concepts_course_id_idx").on(table.courseId)],
);

export const doclingTestArtifact = pgTable(
  "docling_test_artifacts",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => doclingTestRun.id, { onDelete: "cascade" })
      .unique(),
    markdown: text("markdown").notNull(),
    rawJson: jsonb("raw_json").notNull(),
    stats: jsonb("stats"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("docling_test_artifacts_run_id_idx").on(table.runId)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  parseTestRuns: many(parseTestRun),
  doclingTestRuns: many(doclingTestRun),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const parseTestRunRelations = relations(parseTestRun, ({ one }) => ({
  user: one(user, {
    fields: [parseTestRun.userId],
    references: [user.id],
  }),
  course: one(parseTestCourse, {
    fields: [parseTestRun.id],
    references: [parseTestCourse.runId],
  }),
}));

export const parseTestCourseRelations = relations(
  parseTestCourse,
  ({ one, many }) => ({
    run: one(parseTestRun, {
      fields: [parseTestCourse.runId],
      references: [parseTestRun.id],
    }),
    assignments: many(parseTestAssignment),
    contacts: many(parseTestContact),
    events: many(parseTestEvent),
    gradingItems: many(parseTestGradingItem),
    concepts: many(parseTestConcept),
  }),
);

export const parseTestAssignmentRelations = relations(parseTestAssignment, ({ one }) => ({
  course: one(parseTestCourse, {
    fields: [parseTestAssignment.courseId],
    references: [parseTestCourse.id],
  }),
}));

export const parseTestContactRelations = relations(parseTestContact, ({ one }) => ({
  course: one(parseTestCourse, {
    fields: [parseTestContact.courseId],
    references: [parseTestCourse.id],
  }),
}));

export const parseTestEventRelations = relations(parseTestEvent, ({ one }) => ({
  course: one(parseTestCourse, {
    fields: [parseTestEvent.courseId],
    references: [parseTestCourse.id],
  }),
}));

export const parseTestGradingItemRelations = relations(parseTestGradingItem, ({ one }) => ({
  course: one(parseTestCourse, {
    fields: [parseTestGradingItem.courseId],
    references: [parseTestCourse.id],
  }),
}));

export const parseTestConceptRelations = relations(parseTestConcept, ({ one }) => ({
  course: one(parseTestCourse, {
    fields: [parseTestConcept.courseId],
    references: [parseTestCourse.id],
  }),
}));

export const doclingTestRunRelations = relations(doclingTestRun, ({ one }) => ({
  user: one(user, {
    fields: [doclingTestRun.userId],
    references: [user.id],
  }),
  course: one(doclingTestCourse, {
    fields: [doclingTestRun.id],
    references: [doclingTestCourse.runId],
  }),
  artifact: one(doclingTestArtifact, {
    fields: [doclingTestRun.id],
    references: [doclingTestArtifact.runId],
  }),
}));

export const doclingTestCourseRelations = relations(doclingTestCourse, ({ one, many }) => ({
  run: one(doclingTestRun, {
    fields: [doclingTestCourse.runId],
    references: [doclingTestRun.id],
  }),
  assignments: many(doclingTestAssignment),
  contacts: many(doclingTestContact),
  events: many(doclingTestEvent),
  gradingItems: many(doclingTestGradingItem),
  concepts: many(doclingTestConcept),
}));

export const doclingTestAssignmentRelations = relations(doclingTestAssignment, ({ one }) => ({
  course: one(doclingTestCourse, {
    fields: [doclingTestAssignment.courseId],
    references: [doclingTestCourse.id],
  }),
}));

export const doclingTestContactRelations = relations(doclingTestContact, ({ one }) => ({
  course: one(doclingTestCourse, {
    fields: [doclingTestContact.courseId],
    references: [doclingTestCourse.id],
  }),
}));

export const doclingTestEventRelations = relations(doclingTestEvent, ({ one }) => ({
  course: one(doclingTestCourse, {
    fields: [doclingTestEvent.courseId],
    references: [doclingTestCourse.id],
  }),
}));

export const doclingTestGradingItemRelations = relations(doclingTestGradingItem, ({ one }) => ({
  course: one(doclingTestCourse, {
    fields: [doclingTestGradingItem.courseId],
    references: [doclingTestCourse.id],
  }),
}));

export const doclingTestConceptRelations = relations(doclingTestConcept, ({ one }) => ({
  course: one(doclingTestCourse, {
    fields: [doclingTestConcept.courseId],
    references: [doclingTestCourse.id],
  }),
}));

export const doclingTestArtifactRelations = relations(doclingTestArtifact, ({ one }) => ({
  run: one(doclingTestRun, {
    fields: [doclingTestArtifact.runId],
    references: [doclingTestRun.id],
  }),
}));
