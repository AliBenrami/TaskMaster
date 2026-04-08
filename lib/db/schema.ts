import { relations, sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
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
    scope: text("scope").notNull().default("global").unique(),
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
    term: text("term"),
    instructorName: text("instructor_name"),
    meetingDays: text("meeting_days"),
    meetingTime: text("meeting_time"),
    meetingLocation: text("meeting_location"),
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

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
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
