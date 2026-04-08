import { randomUUID, createHash } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import {
  createPartFromText,
  createPartFromUri,
  createUserContent,
  GoogleGenAI,
} from "@google/genai";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  parseTestAssignment,
  parseTestConcept,
  parseTestContact,
  parseTestCourse,
  parseTestEvent,
  parseTestGradingItem,
  parseTestRun,
} from "@/lib/db/schema";
import {
  type ParseTestEventPayload,
  type ParseStatus,
  type ParseTestRunSummary,
  type NormalizedParseTestSchedule,
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
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ParseTestError";
  }
}

type SyllabusValidationResult = {
  isLikelySyllabus: boolean;
  score: number;
  matchedSignals: string[];
  reason: string;
};

type ParseActivityLogger = (message: string) => void;

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

function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normaliseStringList(values: string[]) {
  return dedupeByKey(
    values.map((value) => value.trim()).filter((value) => value.length > 0),
    (value) => value.toLowerCase(),
  );
}

function normaliseRole(role: string) {
  const trimmed = role.trim();
  const lowered = trimmed.toLowerCase();

  if (lowered.includes("teaching assistant") || lowered === "ta" || lowered.includes("ta ")) {
    return "TA";
  }

  if (lowered.includes("prof")) {
    return "Professor";
  }

  if (lowered.includes("instructor")) {
    return "Instructor";
  }

  return trimmed;
}

function normaliseEmail(value: string | null) {
  const normalized = normaliseNullableText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function splitExplicitDateTextVariants(dateText: string) {
  const normalized = dateText.replace(/\s+/g, " ").trim();
  const monthPattern =
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}\b/gi;
  const monthMatches = dedupeByKey(
    Array.from(normalized.matchAll(monthPattern), (match) => match[0].trim()),
    (value) => value.toLowerCase(),
  );

  if (monthMatches.length >= 2) {
    return monthMatches;
  }

  const sameMonthMatch = normalized.match(
    /^((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?)\s+(.+)$/i,
  );

  if (!sameMonthMatch || !/[,&-]|\band\b/i.test(normalized)) {
    return [normalized];
  }

  const [, month, rest] = sameMonthMatch;
  const dayMatches = dedupeByKey(
    Array.from(rest.matchAll(/\b\d{1,2}\b/g), (match) => match[0]),
    (value) => value,
  );

  if (dayMatches.length < 2) {
    return [normalized];
  }

  return dayMatches.map((day) => `${month} ${day}`);
}

function expandEventDates(event: ParseTestEventPayload): ParseTestEventPayload[] {
  if (normaliseNullableText(event.isoDate)) {
    return [event];
  }

  const variants = splitExplicitDateTextVariants(event.dateText);
  if (variants.length <= 1) {
    return [event];
  }

  return variants.map((dateText) => ({
    ...event,
    dateText,
  }));
}

function toAssignmentBackedEvent(assignment: ParseTestPayload["assignments"][number]): ParseTestEventPayload {
  return {
    title: assignment.title,
    category: assignment.category,
    dateText: assignment.dateText,
    isoDate: assignment.isoDate,
    timeText: assignment.timeText,
    location: null,
    sourceSnippet: assignment.sourceSnippet,
  };
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
- keyConcepts should reflect the major topics to be covered in the course.
- contacts should include the primary instructor and all teaching assistants when the syllabus provides them.
- Use role values like Professor and TA when applicable.
- contacts may omit email, officeHours, or location only when the syllabus does not provide them.
- courseSection should capture the section identifier when present.
- requiredMaterials should include textbooks, readers, software, websites, or source material the syllabus requires or strongly expects.
- homeworkTools should include homework or class platforms like Canvas, Gradescope, Blackboard, WebAssign, Piazza, or specific coding tools when they are explicitly named.
- gradingBreakdown should include the major categories and weights only when the syllabus explicitly gives them.
- assignments should include all discernible deadlines, exams, quizzes, projects, papers, labs, discussions, and final deliverables.
- events should include every explicit calendar-dated syllabus item, including exams, assignments, presentations, holidays, cancellations, or special meetings.
- Do not include recurring weekly class meetings in events unless the syllabus gives a specific calendar date.
- If one syllabus line contains multiple explicit dates, return separate event objects for each date.
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
  const assignments = payload.assignments.map((assignment) => ({
    ...assignment,
    title: assignment.title.trim(),
    category: assignment.category.trim(),
    dateText: assignment.dateText.trim(),
    isoDate: normaliseNullableText(assignment.isoDate),
    timeText: normaliseNullableText(assignment.timeText),
    weight: normalisePercent(assignment.weight),
    sourceSnippet: assignment.sourceSnippet.trim(),
  }));

  const contacts = dedupeByKey(
    payload.contacts
      .map((contact) => ({
        ...contact,
        role: normaliseRole(contact.role),
        name: contact.name.trim(),
        email: normaliseEmail(contact.email),
        officeHours: normaliseNullableText(contact.officeHours),
        location: normaliseNullableText(contact.location),
        sourceSnippet: contact.sourceSnippet.trim(),
      }))
      .filter((contact) => contact.name.length > 0),
    (contact) => `${contact.role.toLowerCase()}|${contact.name.toLowerCase()}|${contact.email ?? ""}`,
  );

  const directEvents = payload.events
    .map((event) => ({
      ...event,
      title: event.title.trim(),
      category: event.category.trim(),
      dateText: event.dateText.trim(),
      isoDate: normaliseNullableText(event.isoDate),
      timeText: normaliseNullableText(event.timeText),
      location: normaliseNullableText(event.location),
      sourceSnippet: event.sourceSnippet.trim(),
    }))
    .flatMap(expandEventDates);

  const assignmentBackedEvents = assignments.map(toAssignmentBackedEvent).flatMap(expandEventDates);
  const events = dedupeByKey([...directEvents, ...assignmentBackedEvents], (event) =>
    [
      event.title.trim().toLowerCase(),
      event.category.trim().toLowerCase(),
      (event.isoDate ?? "").toLowerCase(),
      event.dateText.trim().toLowerCase(),
      (event.timeText ?? "").toLowerCase(),
    ].join("|"),
  );

  return {
    ...payload,
    courseCode: normaliseNullableText(payload.courseCode),
    courseSection: normaliseNullableText(payload.courseSection),
    term: normaliseNullableText(payload.term),
    instructorName: normaliseNullableText(payload.instructorName),
    meetingDays: normaliseNullableText(payload.meetingDays),
    meetingTime: normaliseNullableText(payload.meetingTime),
    meetingLocation: normaliseNullableText(payload.meetingLocation),
    requiredMaterials: normaliseStringList(payload.requiredMaterials),
    homeworkTools: normaliseStringList(payload.homeworkTools),
    catalogDescription: normaliseNullableText(payload.catalogDescription),
    keyConcepts: payload.keyConcepts
      .map((concept) => concept.trim())
      .filter((concept, index, list) => concept.length > 0 && list.indexOf(concept) === index),
    contacts,
    gradingBreakdown: payload.gradingBreakdown.map((item) => ({
      ...item,
      label: item.label.trim(),
      weight: normalisePercent(item.weight) ?? 0,
      sourceSnippet: item.sourceSnippet.trim(),
    })),
    assignments,
    events,
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

function normaliseValidationText(value: string) {
  return value
    .replace(/\0/g, " ")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function decodePdfLiteralText(value: string) {
  return value
    .replace(/\\([0-7]{1,3})/g, (_match, octal) => String.fromCharCode(Number.parseInt(octal, 8)))
    .replace(/\\([nrtbf])/g, (_match, escapeChar) => {
      switch (escapeChar) {
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "b":
          return "\b";
        case "f":
          return "\f";
        default:
          return escapeChar;
      }
    })
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\\r?\n/g, "");
}

function decodePdfHexText(value: string) {
  const evenLength = value.length % 2 === 0 ? value : `${value}0`;

  try {
    return Buffer.from(evenLength, "hex").toString("latin1");
  } catch {
    return "";
  }
}

function extractPdfTextChunks(content: string) {
  const chunks: string[] = [];
  const literalPattern = /\((?:\\.|[^\\()])*\)/g;
  const hexPattern = /<([0-9A-Fa-f\s]+)>/g;

  for (const match of content.matchAll(literalPattern)) {
    const literal = match[0].slice(1, -1);
    const decoded = decodePdfLiteralText(literal).trim();
    if (decoded) {
      chunks.push(decoded);
    }
  }

  for (const match of content.matchAll(hexPattern)) {
    const decoded = decodePdfHexText(match[1].replace(/\s+/g, "")).trim();
    if (decoded) {
      chunks.push(decoded);
    }
  }

  return chunks;
}

function extractCandidateSyllabusText(fileName: string, fileBuffer: Buffer) {
  const rawPdfText = fileBuffer.toString("latin1");
  const chunks = [fileName, rawPdfText];
  const streamPattern = /(<<[\s\S]*?>>)\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;

  for (const match of rawPdfText.matchAll(streamPattern)) {
    const [, streamHeader, streamBody] = match;
    const streamTexts = [streamBody];

    if (/flatedecode/i.test(streamHeader)) {
      try {
        streamTexts.push(inflateSync(Buffer.from(streamBody, "latin1")).toString("latin1"));
      } catch {
        // Best-effort only. Validation falls back to the raw PDF bytes when decompression fails.
      }
    }

    for (const streamText of streamTexts) {
      chunks.push(streamText);
      chunks.push(...extractPdfTextChunks(streamText));
    }
  }

  return chunks.join("\n").slice(0, 500_000);
}

function scoreSyllabusSignals(fileNameText: string, documentText: string): SyllabusValidationResult {
  const signalGroups = [
    { label: "syllabus", weight: 4, pattern: /\bsyllabus\b/i },
    { label: "course description", weight: 3, pattern: /\bcourse\s+description\b/i },
    { label: "grading policy", weight: 3, pattern: /\bgrading(?:\s+policy)?\b/i },
    { label: "office hours", weight: 3, pattern: /\boffice\s+hours\b/i },
    { label: "learning outcomes", weight: 3, pattern: /\blearning\s+outcomes?\b/i },
    { label: "required materials", weight: 3, pattern: /\brequired\s+materials?\b/i },
    { label: "required textbook", weight: 3, pattern: /\brequired\s+text(?:book|books?)\b/i },
    { label: "assignment", weight: 2, pattern: /\bassignments?\b/i },
    { label: "exam", weight: 2, pattern: /\bexam(?:s)?\b/i },
    { label: "quiz", weight: 2, pattern: /\bquiz(?:zes)?\b/i },
    { label: "attendance", weight: 2, pattern: /\battendance\b/i },
    { label: "course objectives", weight: 2, pattern: /\bcourse\s+objectives?\b/i },
    { label: "schedule", weight: 2, pattern: /\bschedule\b/i },
    { label: "academic integrity", weight: 2, pattern: /\bacademic\s+integrity\b/i },
    { label: "course information", weight: 1, pattern: /\bcourse\s+information\b/i },
    { label: "required texts", weight: 1, pattern: /\brequired\s+texts?\b/i },
    { label: "evaluation", weight: 1, pattern: /\bevaluation\b/i },
    { label: "week 1", weight: 1, pattern: /\bweek\s+1\b/i },
    {
      label: "calendar date",
      weight: 1,
      pattern:
        /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}\b/i,
    },
  ] as const;

  const matchedSignals: string[] = [];
  let score = 0;

  for (const signal of signalGroups) {
    const fileNameMatch = signal.pattern.test(fileNameText);
    const documentMatch = signal.pattern.test(documentText);

    if (fileNameMatch) {
      score += Math.max(1, Math.ceil(signal.weight / 2));
      matchedSignals.push(`filename:${signal.label}`);
    }

    if (documentMatch) {
      score += signal.weight;
      matchedSignals.push(`document:${signal.label}`);
    }
  }

  const hasFilenameSyllabus = matchedSignals.includes("filename:syllabus");
  const hasSyllabusSignal = matchedSignals.some((signal) => signal.endsWith(":syllabus"));
  const hasAdditionalAcademicSignal = matchedSignals.some((signal) => !signal.endsWith(":syllabus"));
  const hasNegativeResumeSignal =
    /\b(?:resume|curriculum vitae|cv)\b/i.test(fileNameText) ||
    /\b(?:resume|curriculum vitae)\b/i.test(documentText);
  const isLikelySyllabus =
    (!hasNegativeResumeSignal && hasFilenameSyllabus) ||
    score >= 8 ||
    (hasSyllabusSignal && hasAdditionalAcademicSignal);

  return {
    isLikelySyllabus,
    score,
    matchedSignals,
    reason: isLikelySyllabus
      ? "The PDF contains enough syllabus-like structure to proceed to Gemini."
      : hasNegativeResumeSignal
        ? "The PDF looks more like a resume/CV than a course syllabus."
        : "The PDF did not contain enough syllabus-specific academic signals after local validation.",
  };
}

function validateSyllabusCandidate(fileName: string, fileBuffer: Buffer, log?: ParseActivityLogger) {
  const fileNameText = normaliseValidationText(fileName);
  const documentText = normaliseValidationText(extractCandidateSyllabusText(fileName, fileBuffer));
  const result = scoreSyllabusSignals(fileNameText, documentText);

  if (result.isLikelySyllabus) {
    log?.(
      `Syllabus validation accepted (score ${result.score}). Signals: ${
        result.matchedSignals.slice(0, 6).join(", ") || "none"
      }.`,
    );
    return result;
  }

  console.warn("ParseTest rejected upload during local syllabus validation.", {
    fileName,
    score: result.score,
    matchedSignals: result.matchedSignals,
    reason: result.reason,
  });

  throw new ParseTestError("This PDF does not appear to be a course syllabus.", 422, result);
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

async function parseSyllabusWithGemini(
  fileName: string,
  fileBuffer: Buffer,
  log?: ParseActivityLogger,
) {
  const tempFilePath = join(tmpdir(), `parse-test-${randomUUID()}.pdf`);
  const ai = getGenAiClient();

  try {
    log?.("Writing the uploaded PDF to a temporary file for Gemini.");
    await writeFile(tempFilePath, fileBuffer);

    log?.("Uploading the PDF to the Gemini Files API.");
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

    log?.("Gemini file upload succeeded. Requesting structured syllabus extraction.");
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

    log?.("Gemini returned JSON. Validating the structured parse against the schema.");
    const payload = parsePayloadText(responseText);
    log?.("Structured parse validated successfully.");

    return {
      geminiFileUri: uploadedFile.uri,
      payload,
    };
  } catch (error) {
    throw toPublicError(error);
  } finally {
    log?.("Cleaning up the temporary upload file.");
    await rm(tempFilePath, { force: true });
  }
}

async function getRunById(userId: string, runId: string) {
  const runs = await db
    .select()
    .from(parseTestRun)
    .where(and(eq(parseTestRun.userId, userId), eq(parseTestRun.id, runId)))
    .limit(1);

  return runs[0] ?? null;
}

async function getLatestCompletedRunId(userId: string) {
  const summaries = await getParseTestRunSummaries(userId);
  return summaries[0]?.runId ?? null;
}

async function createProcessingRun(params: {
  runId: string;
  userId: string;
  contentHash: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  parseModel: string;
}) {
  await db.insert(parseTestRun).values({
    id: params.runId,
    userId: params.userId,
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
    courseSection: payload.courseSection,
    term: payload.term,
    instructorName: payload.instructorName,
    meetingDays: payload.meetingDays,
    meetingTime: payload.meetingTime,
    meetingLocation: payload.meetingLocation,
    requiredMaterials: payload.requiredMaterials,
    homeworkTools: payload.homeworkTools,
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

  if (payload.contacts.length > 0) {
    await db.insert(parseTestContact).values(
      payload.contacts.map((contact, index) => ({
        id: randomUUID(),
        courseId,
        role: contact.role,
        name: contact.name,
        email: contact.email,
        officeHours: contact.officeHours,
        location: contact.location,
        sourceSnippet: contact.sourceSnippet,
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

  if (payload.events.length > 0) {
    await db.insert(parseTestEvent).values(
      payload.events.map((event, index) => ({
        id: randomUUID(),
        courseId,
        title: event.title,
        category: event.category,
        dateText: event.dateText,
        dueAt: parseIsoDate(event.isoDate),
        timeText: event.timeText,
        location: event.location,
        sourceSnippet: event.sourceSnippet,
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

async function replaceCurrentRunWithFailure(runId: string, userId: string, message: string) {
  await db.delete(parseTestRun).where(eq(parseTestRun.id, runId));
  await db.insert(parseTestRun).values({
    id: runId,
    userId,
    contentHash: "",
    originalFileName: "failed-parse",
    mimeType: "application/pdf",
    fileSizeBytes: 0,
    parseStatus: "failed",
    parseModel: getParseTestModel(),
    warnings: [message],
  });
}

export async function getParseTestViewModel(userId: string): Promise<ParseTestViewModel | null> {
  const latestRunId = await getLatestCompletedRunId(userId);
  if (!latestRunId) {
    return null;
  }

  return getParseTestViewModelForRun(userId, latestRunId);
}

export async function getParseTestViewModelForRun(
  userId: string,
  runId: string,
): Promise<ParseTestViewModel | null> {
  const run = await getRunById(userId, runId);
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

  const [concepts, contacts, gradingItems, assignments, events] = await Promise.all([
    db.select().from(parseTestConcept).where(eq(parseTestConcept.courseId, course.id)),
    db.select().from(parseTestContact).where(eq(parseTestContact.courseId, course.id)),
    db.select().from(parseTestGradingItem).where(eq(parseTestGradingItem.courseId, course.id)),
    db.select().from(parseTestAssignment).where(eq(parseTestAssignment.courseId, course.id)),
    db.select().from(parseTestEvent).where(eq(parseTestEvent.courseId, course.id)),
  ]);

  const sortedConcepts = [...concepts].sort((a, b) => a.displayOrder - b.displayOrder);
  const sortedContacts = [...contacts].sort((a, b) => {
    const rank = (role: string) => {
      const lowered = role.toLowerCase();
      if (lowered === "professor") {
        return 0;
      }
      if (lowered === "instructor") {
        return 1;
      }
      if (lowered === "ta") {
        return 2;
      }
      return 3;
    };

    return rank(a.role) - rank(b.role) || a.displayOrder - b.displayOrder;
  });
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
  const sortedEvents = [...events].sort((a, b) => {
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
      courseSection: course.courseSection,
      term: course.term,
      instructorName: course.instructorName,
      meetingDays: course.meetingDays,
      meetingTime: course.meetingTime,
      meetingLocation: course.meetingLocation,
      requiredMaterials: course.requiredMaterials,
      homeworkTools: course.homeworkTools,
      catalogDescription: course.catalogDescription,
      studentSummary: course.studentSummary,
      descriptionSource: course.descriptionSource,
    },
    concepts: sortedConcepts.map((concept) => ({
      id: concept.id,
      label: concept.label,
      displayOrder: concept.displayOrder,
    })),
    contacts: sortedContacts.map((contact) => ({
      id: contact.id,
      role: contact.role,
      name: contact.name,
      email: contact.email,
      officeHours: contact.officeHours,
      location: contact.location,
      sourceSnippet: contact.sourceSnippet,
      displayOrder: contact.displayOrder,
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
    events: sortedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      category: event.category,
      dateText: event.dateText,
      dueAt: event.dueAt ? event.dueAt.toISOString() : null,
      timeText: event.timeText,
      location: event.location,
      sourceSnippet: event.sourceSnippet,
      displayOrder: event.displayOrder,
    })),
  };
}

export async function getParseTestRunSummaries(userId: string): Promise<ParseTestRunSummary[]> {
  const runs = await db
    .select()
    .from(parseTestRun)
    .where(eq(parseTestRun.userId, userId))
    .orderBy(desc(parseTestRun.updatedAt));

  if (runs.length === 0) {
    return [];
  }

  const runIds = runs.map((run) => run.id);
  const courses = await db
    .select({
      runId: parseTestCourse.runId,
      title: parseTestCourse.title,
      courseCode: parseTestCourse.courseCode,
      term: parseTestCourse.term,
    })
    .from(parseTestCourse)
    .where(inArray(parseTestCourse.runId, runIds));

  const courseByRunId = new Map(courses.map((course) => [course.runId, course]));

  return runs
    .map((run) => {
      const course = courseByRunId.get(run.id);
      if (!course) {
        return null;
      }

      return {
        runId: run.id,
        title: course.title,
        courseCode: course.courseCode,
        term: course.term,
        updatedAt: run.updatedAt.toISOString(),
      } satisfies ParseTestRunSummary;
    })
    .filter((summary): summary is ParseTestRunSummary => summary !== null);
}

export async function getNormalizedParseTestSchedule(
  userId: string,
): Promise<NormalizedParseTestSchedule | null> {
  const preview = await getParseTestViewModel(userId);

  if (!preview) {
    return null;
  }

  return {
    course: {
      id: preview.course.id,
      title: preview.course.title,
      courseCode: preview.course.courseCode,
      courseSection: preview.course.courseSection,
      term: preview.course.term,
      instructorName: preview.course.instructorName,
      meetingDays: preview.course.meetingDays,
      meetingTime: preview.course.meetingTime,
      meetingLocation: preview.course.meetingLocation,
      requiredMaterials: preview.course.requiredMaterials,
      homeworkTools: preview.course.homeworkTools,
      summary: preview.course.studentSummary,
    },
    contacts: preview.contacts,
    gradingItems: preview.gradingItems,
    topics: preview.concepts,
    assignments: preview.assignments,
    events: preview.events,
    parseIssues: preview.run.warnings,
  };
}

export async function replaceParseTestWithUpload(params: {
  userId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  onLog?: ParseActivityLogger;
}) {
  const { userId, fileBuffer, fileName, mimeType, fileSizeBytes, onLog } = params;
  const logs: string[] = [];
  const log: ParseActivityLogger = (message) => {
    logs.push(message);
    onLog?.(message);
  };

  log(`Received upload "${fileName}" (${Math.round(fileSizeBytes / 1024)} KB).`);
  const contentHash = createHash("sha256").update(fileBuffer).digest("hex");
  const parseModel = getParseTestModel();
  let runId: string | null = null;

  try {
    log("Computed the SHA-256 hash for duplicate detection.");
    validateSyllabusCandidate(fileName, fileBuffer, log);
    log("Checking your existing saved classes for an identical completed parse.");
    const userRuns = await db
      .select()
      .from(parseTestRun)
      .where(eq(parseTestRun.userId, userId))
      .orderBy(desc(parseTestRun.updatedAt));
    const processingRun = userRuns.find((run) => run.parseStatus === "processing") ?? null;
    const duplicateRun =
      userRuns.find((run) => run.contentHash === contentHash && run.parseStatus === "completed") ?? null;

    if (processingRun) {
      log("Another ParseTest job is already processing for this account.");
      throw new ParseTestError("ParseTest is already processing a syllabus. Wait for it to finish and try again.", 409);
    }

    if (duplicateRun) {
      log("Found an existing completed class with the same file hash. Reusing the saved SQL preview.");
      const viewModel = await getParseTestViewModelForRun(userId, duplicateRun.id);

      if (viewModel) {
        log("Loaded the saved preview from SQL.");
        return { isDuplicate: true, runId: duplicateRun.id, viewModel, logs };
      }
    }

    runId = randomUUID();

    log("No duplicate found. Creating a new processing run in SQL.");
    await createProcessingRun({
      runId,
      userId,
      contentHash,
      fileName,
      mimeType,
      fileSizeBytes,
      parseModel,
    });

    const { payload, geminiFileUri } = await parseSyllabusWithGemini(fileName, fileBuffer, log);
    log("Persisting the normalized course graph to SQL.");
    await persistCompletedParse({
      runId,
      geminiFileUri,
      payload,
    });

    log("Reloading the saved preview from SQL.");
    const viewModel = await getParseTestViewModelForRun(userId, runId);
    if (!viewModel) {
      throw new ParseTestError("ParseTest saved the syllabus but could not reload the preview from SQL.", 500);
    }

    log("Saved preview loaded successfully.");
    return { isDuplicate: false, runId, viewModel, logs };
  } catch (error) {
    const publicError = toPublicError(error);

    log(`Parse failed: ${publicError.message}`);
    if (runId) {
      await replaceCurrentRunWithFailure(runId, userId, publicError.message);
    }

    throw new ParseTestError(publicError.message, publicError.status, {
      ...(publicError.details ?? {}),
      logs,
    });
  }
}

export async function deleteParseTestRun(params: { userId: string; runId: string }) {
  const run = await getRunById(params.userId, params.runId);

  if (!run) {
    throw new ParseTestError("That saved class could not be found.", 404);
  }

  await db.delete(parseTestRun).where(and(eq(parseTestRun.id, params.runId), eq(parseTestRun.userId, params.userId)));
  const nextRunId = await getLatestCompletedRunId(params.userId);

  return { nextRunId };
}

export function getParseTestErrorResponse(error: unknown) {
  const publicError = toPublicError(error);

  return {
    message: publicError.message,
    status: publicError.status,
    details: publicError.details,
  };
}
