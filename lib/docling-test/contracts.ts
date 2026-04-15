import { z } from "zod";
import {
  descriptionSourceValues,
  parseStatusValues,
  parseTestPayloadSchema,
  type DescriptionSource,
  type ParseStatus,
  type ParseTestPayload,
} from "@/lib/parse-test/contracts";

export type { DescriptionSource, ParseStatus } from "@/lib/parse-test/contracts";

export const MAX_DOCLING_TEST_FILE_BYTES = 20 * 1024 * 1024;

export const doclingInputFormatValues = ["pdf", "docx"] as const;
export type DoclingInputFormat = (typeof doclingInputFormatValues)[number];

export const doclingBackendValues = ["local-python", "remote-api"] as const;
export type DoclingBackend = (typeof doclingBackendValues)[number];

export const doclingStatsSchema = z
  .object({
    pageCount: z.number().int().nonnegative().nullable().optional(),
    tableCount: z.number().int().nonnegative().nullable().optional(),
    pictureCount: z.number().int().nonnegative().nullable().optional(),
    codeBlockCount: z.number().int().nonnegative().nullable().optional(),
    headingCount: z.number().int().nonnegative().nullable().optional(),
    formulaCount: z.number().int().nonnegative().nullable().optional(),
  })
  .partial();

export type DoclingStats = z.infer<typeof doclingStatsSchema>;

export const doclingProviderPayloadSchema = z.object({
  ok: z.literal(true),
  provider: z.string().trim().min(1).max(100),
  providerVersion: z.string().trim().max(100).nullable(),
  inputFormat: z.enum(doclingInputFormatValues),
  markdown: z.string(),
  rawJson: z.unknown(),
  warnings: z.array(z.string().trim().max(300)).max(50),
});

export type DoclingProviderPayload = z.infer<typeof doclingProviderPayloadSchema>;

export type DoclingNormalizedCandidate = ParseTestPayload;

export type DocumentParseProviderResult = {
  provider: string;
  providerVersion: string | null;
  inputFormat: DoclingInputFormat;
  markdown: string;
  rawJson: unknown;
  warnings: string[];
  stats: DoclingStats | null;
  normalizedCandidate: DoclingNormalizedCandidate;
};

export type DocumentParseProviderInput = {
  tempFilePath: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  inputFormat: DoclingInputFormat;
  onLog?: (message: string) => void;
};

export interface DocumentParseProvider {
  parse(input: DocumentParseProviderInput): Promise<DocumentParseProviderResult>;
}

export type DoclingTestViewModel = {
  run: {
    id: string;
    contentHash: string;
    parseStatus: ParseStatus;
    provider: string;
    providerVersion: string | null;
    backend: DoclingBackend;
    inputFormat: DoclingInputFormat;
    warnings: string[];
    createdAt: string;
    updatedAt: string;
  };
  course: {
    id: string;
    title: string;
    courseCode: string | null;
    courseSection: string | null;
    term: string | null;
    instructorName: string | null;
    meetingDays: string | null;
    meetingTime: string | null;
    meetingLocation: string | null;
    requiredMaterials: string[];
    homeworkTools: string[];
    catalogDescription: string | null;
    studentSummary: string;
    descriptionSource: DescriptionSource;
  };
  concepts: Array<{
    id: string;
    label: string;
    displayOrder: number;
  }>;
  contacts: Array<{
    id: string;
    role: string;
    name: string;
    email: string | null;
    officeHours: string | null;
    location: string | null;
    sourceSnippet: string;
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
  events: Array<{
    id: string;
    title: string;
    category: string;
    dateText: string;
    dueAt: string | null;
    timeText: string | null;
    location: string | null;
    sourceSnippet: string;
    displayOrder: number;
  }>;
  artifact: {
    markdown: string;
    rawJson: unknown;
    stats: DoclingStats | null;
  };
};

export type DoclingTestRunSummary = {
  runId: string;
  title: string;
  courseCode: string | null;
  term: string | null;
  inputFormat: DoclingInputFormat;
  updatedAt: string;
};

export type DoclingComparisonSummary = {
  availability: "matched" | "unavailable";
  reason: string;
  parseTestRunId: string | null;
  counts: Array<{
    label:
      | "Concepts"
      | "Contacts"
      | "Grading"
      | "Assignments"
      | "Events"
      | "Materials"
      | "Tools";
    docling: number;
    parseTest: number;
    delta: number;
  }>;
};

export type NormalizedDoclingTestSchedule = {
  course: {
    id: string;
    title: string;
    courseCode: string | null;
    courseSection: string | null;
    term: string | null;
    instructorName: string | null;
    meetingDays: string | null;
    meetingTime: string | null;
    meetingLocation: string | null;
    requiredMaterials: string[];
    homeworkTools: string[];
    summary: string;
  };
  contacts: DoclingTestViewModel["contacts"];
  gradingItems: DoclingTestViewModel["gradingItems"];
  topics: DoclingTestViewModel["concepts"];
  assignments: DoclingTestViewModel["assignments"];
  events: DoclingTestViewModel["events"];
  parseIssues: string[];
};

export const doclingParseStatusSchema = z.enum(parseStatusValues);
export const doclingDescriptionSourceSchema = z.enum(descriptionSourceValues);
export const doclingNormalizedCandidateSchema = parseTestPayloadSchema;
