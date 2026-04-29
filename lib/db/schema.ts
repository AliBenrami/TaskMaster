import { relations, sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";

export const noteSourceEnum = pgEnum("note_source", ["manual", "upload"]);

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

export const note = pgTable(
  "note",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled"),
    content: jsonb("content"),
    sourceType: noteSourceEnum("source_type").notNull().default("manual"),
    fileUrl: text("file_url"),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("note_userId_idx").on(table.userId),
    index("note_createdAt_idx").on(table.createdAt),
  ],
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

export const embedding = pgTable(
  "embedding",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    chunkIndex: integer("chunk_index").notNull().default(0),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("embedding_user_source_idx").on(
      table.userId,
      table.sourceType,
      table.sourceId,
    ),
    index("embedding_hash_idx").on(
      table.userId,
      table.sourceType,
      table.sourceId,
      table.contentHash,
    ),
    index("embedding_hnsw_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const embeddingRelations = relations(embedding, ({ one }) => ({
  user: one(user, {
    fields: [embedding.userId],
    references: [user.id],
  }),
}));

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

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  notes: many(note),
  parseTestRuns: many(parseTestRun),
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

export const noteRelations = relations(note, ({ one }) => ({
  user: one(user, {
    fields: [note.userId],
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
