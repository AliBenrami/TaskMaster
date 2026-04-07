import { randomUUID, createHash } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPartFromText,
  createPartFromUri,
  createUserContent,
  GoogleGenAI,
} from "@google/genai";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  parseTestAssignment,
  parseTestConcept,
  parseTestCourse,
  parseTestGradingItem,
  parseTestRun,
} from "@/lib/db/schema";
import {
  type ParseStatus,
  PARSE_TEST_SCOPE,
  parseTestPayloadSchema,
  parseTestResponseJsonSchema,
  type ParseTestPayload,
  type ParseTestViewModel,
} from "./contracts";
import { getParseTestModel } from "./feature";

class ParseTestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ParseTestError";
  }
}

function getGenAiClient() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new ParseTestError(
      "GOOGLE_GENERATIVE_AI_API_KEY is missing. Add it to your server environment before using ParseTest.",
      500,
    );
  }

  return new GoogleGenAI({ apiKey });
}

function normaliseNullableText(value: string | null) {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalisePercent(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  const scaled = value > 0 && value <= 1 ? value * 100 : value;
  return Math.round(scaled * 100) / 100;
}

function isHighSignalWarning(warning: string) {
  const lowered = warning.toLowerCase();

  if (lowered.includes("does not provide specific due dates")) {
    return false;
  }

  if (lowered.includes("number of quizzes")) {
    return false;
  }

  if (lowered.includes("implies there are exactly four assignments")) {
    return false;
  }

  return true;
}

function parseIsoDate(isoDate: string | null) {
  if (!isoDate) {
    return null;
  }

  const trimmed = isoDate.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T12:00:00.000Z`
    : trimmed;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function createPrompt(fileName: string) {
  return `
You are extracting structured syllabus data for a student dashboard preview.

Input document name: ${fileName}

Return JSON only. Do not wrap the response in markdown fences.

Rules:
- Extract exactly the schema requested.
- Prefer the official catalog or course description section for catalogDescription.
- If there is no official description, use course goals, objectives, or learning outcomes.
- Only infer from topic lists when no formal description exists.
- studentSummary must be a practical 2-3 sentence rewrite for a student dashboard.
- descriptionSource must be one of: catalog_description, course_objectives, learning_outcomes, inferred_from_topics.
- keyConcepts should contain 4-15 concise topic labels.
- gradingBreakdown should include the major categories and weights only when the syllabus explicitly gives them.
- assignments should include all discernible deadlines, exams, quizzes, projects, papers, labs, discussions, and final deliverables.
- Preserve the syllabus wording in dateText.
- Only set isoDate when the syllabus includes an explicit calendar date.
- If a date is relative, unclear, or only says something like "Week 4", leave isoDate null.
- Preserve time-of-day details in timeText when present.
- Never invent dates, weights, instructors, or meeting details.
- sourceSnippet should be a short excerpt or paraphrase that points back to the syllabus text.
- Return percentages as whole percent values, for example 40 for 40% and 10 for 10%, never 0.4 or 0.1.
- warnings should only describe high-signal contradictions or meaningful ambiguity.
- Do not add warnings just because routine assignment or quiz dates are not listed unless that omission blocks extracting a major deadline.
`.trim();
}

function normalisePayload(payload: ParseTestPayload): ParseTestPayload {
  return {
    ...payload,
    courseCode: normaliseNullableText(payload.courseCode),
    term: normaliseNullableText(payload.term),
    instructorName: normaliseNullableText(payload.instructorName),
    meetingDays: normaliseNullableText(payload.meetingDays),
    meetingTime: normaliseNullableText(payload.meetingTime),
    meetingLocation: normaliseNullableText(payload.meetingLocation),
    catalogDescription: normaliseNullableText(payload.catalogDescription),
    keyConcepts: payload.keyConcepts
      .map((concept) => concept.trim())
      .filter((concept, index, list) => concept.length > 0 && list.indexOf(concept) === index),
    gradingBreakdown: payload.gradingBreakdown.map((item) => ({
      ...item,
      label: item.label.trim(),
      weight: normalisePercent(item.weight) ?? 0,
      sourceSnippet: item.sourceSnippet.trim(),
    })),
    assignments: payload.assignments.map((assignment) => ({
      ...assignment,
      title: assignment.title.trim(),
      category: assignment.category.trim(),
      dateText: assignment.dateText.trim(),
      isoDate: normaliseNullableText(assignment.isoDate),
      timeText: normaliseNullableText(assignment.timeText),
      weight: normalisePercent(assignment.weight),
      sourceSnippet: assignment.sourceSnippet.trim(),
    })),
    warnings: payload.warnings
      .map((warning) => warning.trim())
      .filter(
        (warning, index, list) =>
          warning.length > 0 && list.indexOf(warning) === index && isHighSignalWarning(warning),
      ),
  };
}

function parsePayloadText(responseText: string) {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(responseText);
  } catch {
    throw new ParseTestError("Gemini did not return valid JSON for the syllabus parse.", 502);
  }

  const result = parseTestPayloadSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new ParseTestError(
      `Gemini returned JSON that did not match the ParseTest schema: ${result.error.issues
        .map((issue) => issue.path.join(".") || "root")
        .join(", ")}`,
      502,
    );
  }

  return normalisePayload(result.data);
}

function toPublicError(error: unknown) {
  if (error instanceof ParseTestError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message;
    const lowered = message.toLowerCase();

    if (lowered.includes("model") && (lowered.includes("not found") || lowered.includes("not supported"))) {
      return new ParseTestError(
        "The configured Gemini model is unavailable. Switch GEMINI_PARSE_MODEL to gemini-2.5-flash-lite.",
        502,
      );
    }

    if (lowered.includes("deprecated")) {
      return new ParseTestError(
        "The configured Gemini model appears to be deprecated. Switch GEMINI_PARSE_MODEL to gemini-2.5-flash-lite.",
        502,
      );
    }

    if (lowered.includes("resource_exhausted") || lowered.includes("quota")) {
      return new ParseTestError(
        "The current Gemini model or API key has no available quota. Use GEMINI_PARSE_MODEL=gemini-2.5-flash-lite and verify billing/quota for your Google AI key.",
        429,
      );
    }

    return new ParseTestError(message, 500);
  }

  return new ParseTestError("An unexpected ParseTest error occurred.", 500);
}

async function parseSyllabusWithGemini(fileName: string, fileBuffer: Buffer) {
  const tempFilePath = join(tmpdir(), `parse-test-${randomUUID()}.pdf`);
  const ai = getGenAiClient();

  try {
    await writeFile(tempFilePath, fileBuffer);

    const uploadedFile = await ai.files.upload({
      file: tempFilePath,
      config: {
        mimeType: "application/pdf",
        displayName: fileName,
      },
    });

    if (!uploadedFile.uri || !uploadedFile.mimeType) {
      throw new ParseTestError("Gemini Files API upload succeeded without returning a usable file URI.", 502);
    }

    const response = await ai.models.generateContent({
      model: getParseTestModel(),
      contents: createUserContent([
        createPartFromText(createPrompt(fileName)),
        createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
      ]),
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseJsonSchema: parseTestResponseJsonSchema,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new ParseTestError("Gemini returned an empty response for the syllabus parse.", 502);
    }

    return {
      geminiFileUri: uploadedFile.uri,
      payload: parsePayloadText(responseText),
    };
  } catch (error) {
    throw toPublicError(error);
  } finally {
    await rm(tempFilePath, { force: true });
  }
}

async function getCurrentRun() {
  const runs = await db
    .select()
    .from(parseTestRun)
    .where(eq(parseTestRun.scope, PARSE_TEST_SCOPE))
    .limit(1);

  return runs[0] ?? null;
}

async function replaceCurrentRunWithProcessing(params: {
  runId: string;
  contentHash: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  parseModel: string;
}) {
  await db.delete(parseTestRun).where(eq(parseTestRun.scope, PARSE_TEST_SCOPE));
  await db.insert(parseTestRun).values({
    id: params.runId,
    scope: PARSE_TEST_SCOPE,
    contentHash: params.contentHash,
    originalFileName: params.fileName,
    mimeType: params.mimeType,
    fileSizeBytes: params.fileSizeBytes,
    parseStatus: "processing",
    parseModel: params.parseModel,
    warnings: [],
  });
}

async function persistCompletedParse(params: {
  runId: string;
  geminiFileUri: string;
  payload: ParseTestPayload;
}) {
  const { runId, geminiFileUri, payload } = params;
  const courseId = randomUUID();

  await db.insert(parseTestCourse).values({
    id: courseId,
    runId,
    title: payload.courseTitle,
    courseCode: payload.courseCode,
    term: payload.term,
    instructorName: payload.instructorName,
    meetingDays: payload.meetingDays,
    meetingTime: payload.meetingTime,
    meetingLocation: payload.meetingLocation,
    catalogDescription: payload.catalogDescription,
    studentSummary: payload.studentSummary,
    descriptionSource: payload.descriptionSource,
  });

  if (payload.keyConcepts.length > 0) {
    await db.insert(parseTestConcept).values(
      payload.keyConcepts.map((label, index) => ({
        id: randomUUID(),
        courseId,
        label,
        displayOrder: index,
      })),
    );
  }

  if (payload.gradingBreakdown.length > 0) {
    await db.insert(parseTestGradingItem).values(
      payload.gradingBreakdown.map((item, index) => ({
        id: randomUUID(),
        courseId,
        label: item.label,
        weightPercent: item.weight,
        sourceSnippet: item.sourceSnippet,
        displayOrder: index,
      })),
    );
  }

  if (payload.assignments.length > 0) {
    await db.insert(parseTestAssignment).values(
      payload.assignments.map((assignment, index) => ({
        id: randomUUID(),
        courseId,
        title: assignment.title,
        category: assignment.category,
        dateText: assignment.dateText,
        dueAt: parseIsoDate(assignment.isoDate),
        timeText: assignment.timeText,
        weightPercent: assignment.weight,
        sourceSnippet: assignment.sourceSnippet,
        displayOrder: index,
      })),
    );
  }

  await db
    .update(parseTestRun)
    .set({
      parseStatus: "completed",
      geminiFileUri,
      warnings: payload.warnings,
      updatedAt: new Date(),
    })
    .where(eq(parseTestRun.id, runId));
}

async function replaceCurrentRunWithFailure(runId: string, message: string) {
  await db.delete(parseTestRun).where(eq(parseTestRun.id, runId));
  await db.insert(parseTestRun).values({
    id: runId,
    scope: PARSE_TEST_SCOPE,
    contentHash: "",
    originalFileName: "failed-parse",
    mimeType: "application/pdf",
    fileSizeBytes: 0,
    parseStatus: "failed",
    parseModel: getParseTestModel(),
    warnings: [message],
  });
}

export async function getParseTestViewModel(): Promise<ParseTestViewModel | null> {
  const run = await getCurrentRun();
  if (!run) {
    return null;
  }

  const courses = await db
    .select()
    .from(parseTestCourse)
    .where(eq(parseTestCourse.runId, run.id))
    .limit(1);
  const course = courses[0];

  if (!course) {
    return null;
  }

  const [concepts, gradingItems, assignments] = await Promise.all([
    db.select().from(parseTestConcept).where(eq(parseTestConcept.courseId, course.id)),
    db.select().from(parseTestGradingItem).where(eq(parseTestGradingItem.courseId, course.id)),
    db.select().from(parseTestAssignment).where(eq(parseTestAssignment.courseId, course.id)),
  ]);

  const sortedConcepts = [...concepts].sort((a, b) => a.displayOrder - b.displayOrder);
  const sortedGradingItems = [...gradingItems].sort((a, b) => a.displayOrder - b.displayOrder);
  const sortedAssignments = [...assignments].sort((a, b) => {
    if (a.dueAt && b.dueAt) {
      return a.dueAt.getTime() - b.dueAt.getTime() || a.displayOrder - b.displayOrder;
    }

    if (a.dueAt) {
      return -1;
    }

    if (b.dueAt) {
      return 1;
    }

    return a.displayOrder - b.displayOrder;
  });

  return {
    run: {
      id: run.id,
      contentHash: run.contentHash,
      parseModel: run.parseModel,
      parseStatus: run.parseStatus as ParseStatus,
      warnings: run.warnings.filter(isHighSignalWarning),
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
    },
    course: {
      id: course.id,
      title: course.title,
      courseCode: course.courseCode,
      term: course.term,
      instructorName: course.instructorName,
      meetingDays: course.meetingDays,
      meetingTime: course.meetingTime,
      meetingLocation: course.meetingLocation,
      catalogDescription: course.catalogDescription,
      studentSummary: course.studentSummary,
      descriptionSource: course.descriptionSource,
    },
    concepts: sortedConcepts.map((concept) => ({
      id: concept.id,
      label: concept.label,
      displayOrder: concept.displayOrder,
    })),
    gradingItems: sortedGradingItems.map((item) => ({
      id: item.id,
      label: item.label,
      weightPercent: normalisePercent(item.weightPercent) ?? 0,
      sourceSnippet: item.sourceSnippet,
      displayOrder: item.displayOrder,
    })),
    assignments: sortedAssignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      category: assignment.category,
      dateText: assignment.dateText,
      dueAt: assignment.dueAt ? assignment.dueAt.toISOString() : null,
      timeText: assignment.timeText,
      weightPercent: normalisePercent(assignment.weightPercent),
      sourceSnippet: assignment.sourceSnippet,
      displayOrder: assignment.displayOrder,
    })),
  };
}

export async function replaceParseTestWithUpload(params: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}) {
  const { fileBuffer, fileName, mimeType, fileSizeBytes } = params;
  const contentHash = createHash("sha256").update(fileBuffer).digest("hex");
  const parseModel = getParseTestModel();
  const currentRun = await getCurrentRun();

  if (currentRun?.parseStatus === "processing") {
    throw new ParseTestError("ParseTest is already processing a syllabus. Wait for it to finish and try again.", 409);
  }

  if (currentRun?.contentHash === contentHash && currentRun.parseStatus === "completed") {
    const viewModel = await getParseTestViewModel();

    if (viewModel) {
      return { isDuplicate: true, viewModel };
    }
  }

  const runId = randomUUID();

  await replaceCurrentRunWithProcessing({
    runId,
    contentHash,
    fileName,
    mimeType,
    fileSizeBytes,
    parseModel,
  });

  try {
    const { payload, geminiFileUri } = await parseSyllabusWithGemini(fileName, fileBuffer);
    await persistCompletedParse({
      runId,
      geminiFileUri,
      payload,
    });

    const viewModel = await getParseTestViewModel();
    if (!viewModel) {
      throw new ParseTestError("ParseTest saved the syllabus but could not reload the preview from SQL.", 500);
    }

    return { isDuplicate: false, viewModel };
  } catch (error) {
    const publicError = toPublicError(error);

    await replaceCurrentRunWithFailure(runId, publicError.message);

    throw publicError;
  }
}

export function getParseTestErrorResponse(error: unknown) {
  const publicError = toPublicError(error);

  return {
    message: publicError.message,
    status: publicError.status,
  };
}
