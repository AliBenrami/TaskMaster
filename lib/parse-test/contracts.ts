import { z } from "zod";

export const PARSE_TEST_SCOPE = "global";
export const MAX_PARSE_TEST_FILE_BYTES = 20 * 1024 * 1024;

export const parseStatusValues = ["processing", "completed", "failed"] as const;
export type ParseStatus = (typeof parseStatusValues)[number];

export const descriptionSourceValues = [
  "catalog_description",
  "course_objectives",
  "learning_outcomes",
  "inferred_from_topics",
] as const;
export type DescriptionSource = (typeof descriptionSourceValues)[number];

const assignmentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  dateText: z.string().trim().min(1).max(200),
  isoDate: z.string().trim().max(64).nullable(),
  timeText: z.string().trim().max(100).nullable(),
  weight: z.number().min(0).max(100).nullable(),
  sourceSnippet: z.string().trim().min(1).max(500),
});

const gradingItemSchema = z.object({
  label: z.string().trim().min(1).max(100),
  weight: z.number().min(0).max(100),
  sourceSnippet: z.string().trim().min(1).max(500),
});

export const parseTestPayloadSchema = z.object({
  courseTitle: z.string().trim().min(1).max(200),
  courseCode: z.string().trim().max(100).nullable(),
  term: z.string().trim().max(120).nullable(),
  instructorName: z.string().trim().max(160).nullable(),
  meetingDays: z.string().trim().max(160).nullable(),
  meetingTime: z.string().trim().max(160).nullable(),
  meetingLocation: z.string().trim().max(200).nullable(),
  catalogDescription: z.string().trim().max(4000).nullable(),
  studentSummary: z.string().trim().min(1).max(1000),
  descriptionSource: z.enum(descriptionSourceValues),
  keyConcepts: z.array(z.string().trim().min(1).max(100)).max(20),
  gradingBreakdown: z.array(gradingItemSchema).max(20),
  assignments: z.array(assignmentSchema).max(100),
  warnings: z
    .array(z.string().trim().max(300).nullable())
    .max(20)
    .transform((warnings) => warnings.filter((warning): warning is string => Boolean(warning?.trim()))),
});

export type ParseTestPayload = z.infer<typeof parseTestPayloadSchema>;
export type ParseTestAssignmentPayload = z.infer<typeof assignmentSchema>;
export type ParseTestGradingItemPayload = z.infer<typeof gradingItemSchema>;

export type ParseTestViewModel = {
  run: {
    id: string;
    contentHash: string;
    parseModel: string;
    parseStatus: ParseStatus;
    warnings: string[];
    createdAt: string;
    updatedAt: string;
  };
  course: {
    id: string;
    title: string;
    courseCode: string | null;
    term: string | null;
    instructorName: string | null;
    meetingDays: string | null;
    meetingTime: string | null;
    meetingLocation: string | null;
    catalogDescription: string | null;
    studentSummary: string;
    descriptionSource: DescriptionSource;
  };
  concepts: Array<{
    id: string;
    label: string;
    displayOrder: number;
  }>;
  gradingItems: Array<{
    id: string;
    label: string;
    weightPercent: number;
    sourceSnippet: string;
    displayOrder: number;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    category: string;
    dateText: string;
    dueAt: string | null;
    timeText: string | null;
    weightPercent: number | null;
    sourceSnippet: string;
    displayOrder: number;
  }>;
};

export const parseTestResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  propertyOrdering: [
    "courseTitle",
    "courseCode",
    "term",
    "instructorName",
    "meetingDays",
    "meetingTime",
    "meetingLocation",
    "catalogDescription",
    "studentSummary",
    "descriptionSource",
    "keyConcepts",
    "gradingBreakdown",
    "assignments",
    "warnings",
  ],
  required: [
    "courseTitle",
    "studentSummary",
    "descriptionSource",
    "keyConcepts",
    "gradingBreakdown",
    "assignments",
    "warnings",
  ],
  properties: {
    courseTitle: { type: "string" },
    courseCode: { anyOf: [{ type: "string" }, { type: "null" }] },
    term: { anyOf: [{ type: "string" }, { type: "null" }] },
    instructorName: { anyOf: [{ type: "string" }, { type: "null" }] },
    meetingDays: { anyOf: [{ type: "string" }, { type: "null" }] },
    meetingTime: { anyOf: [{ type: "string" }, { type: "null" }] },
    meetingLocation: { anyOf: [{ type: "string" }, { type: "null" }] },
    catalogDescription: { anyOf: [{ type: "string" }, { type: "null" }] },
    studentSummary: { type: "string" },
    descriptionSource: {
      type: "string",
      enum: [...descriptionSourceValues],
    },
    keyConcepts: {
      type: "array",
      items: { type: "string" },
    },
    gradingBreakdown: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        propertyOrdering: ["label", "weight", "sourceSnippet"],
        required: ["label", "weight", "sourceSnippet"],
        properties: {
          label: { type: "string" },
          weight: { type: "number" },
          sourceSnippet: { type: "string" },
        },
      },
    },
    assignments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        propertyOrdering: [
          "title",
          "category",
          "dateText",
          "isoDate",
          "timeText",
          "weight",
          "sourceSnippet",
        ],
        required: [
          "title",
          "category",
          "dateText",
          "isoDate",
          "timeText",
          "weight",
          "sourceSnippet",
        ],
        properties: {
          title: { type: "string" },
          category: { type: "string" },
          dateText: { type: "string" },
          isoDate: { anyOf: [{ type: "string" }, { type: "null" }] },
          timeText: { anyOf: [{ type: "string" }, { type: "null" }] },
          weight: { anyOf: [{ type: "number" }, { type: "null" }] },
          sourceSnippet: { type: "string" },
        },
      },
    },
    warnings: {
      type: "array",
      items: { anyOf: [{ type: "string" }, { type: "null" }] },
    },
  },
} as const;
