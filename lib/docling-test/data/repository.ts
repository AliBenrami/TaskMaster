import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  doclingTestArtifact,
  doclingTestAssignment,
  doclingTestConcept,
  doclingTestContact,
  doclingTestCourse,
  doclingTestEvent,
  doclingTestGradingItem,
  doclingTestRun,
} from "@/lib/db/schema";
import type {
  DoclingBackend,
  DoclingDocumentMode,
  DoclingInputFormat,
  DoclingTestViewModel,
  ParseStatus,
} from "../contracts";
import type { DoclingNormalizedCandidate, DoclingStats } from "../contracts";
import { getDoclingBackend } from "../feature";
import { isHighSignalWarning, normalisePercent, parseIsoDate } from "@/lib/parse-test/normalize";

async function getRunById(userId: string, runId: string) {
  const runs = await db
    .select()
    .from(doclingTestRun)
    .where(and(eq(doclingTestRun.userId, userId), eq(doclingTestRun.id, runId)))
    .limit(1);

  return runs[0] ?? null;
}

async function getLatestCompletedRunId(userId: string, mode?: DoclingDocumentMode) {
  const runs = await getUserDoclingTestRuns(userId, mode);
  const latestCompletedRun = runs.find((run) => run.parseStatus === "completed") ?? null;
  return latestCompletedRun?.id ?? null;
}

export async function getUserDoclingTestRuns(userId: string, mode?: DoclingDocumentMode) {
  const query = db
    .select()
    .from(doclingTestRun)
    .where(
      mode
        ? and(eq(doclingTestRun.userId, userId), eq(doclingTestRun.mode, mode))
        : eq(doclingTestRun.userId, userId),
    )
    .orderBy(desc(doclingTestRun.updatedAt));

  return query;
}

export async function createDoclingProcessingRun(params: {
  runId: string;
  userId: string;
  contentHash: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  mode: DoclingDocumentMode;
  inputFormat: DoclingInputFormat;
  provider: string;
  providerVersion: string | null;
  backend: DoclingBackend;
}) {
  await db.insert(doclingTestRun).values({
    id: params.runId,
    userId: params.userId,
    contentHash: params.contentHash,
    originalFileName: params.fileName,
    mimeType: params.mimeType,
    fileSizeBytes: params.fileSizeBytes,
    mode: params.mode,
    inputFormat: params.inputFormat,
    parseStatus: "processing",
    provider: params.provider,
    providerVersion: params.providerVersion,
    backend: params.backend,
    warnings: [],
  });
}

export async function persistCompletedDoclingParse(params: {
  runId: string;
  provider: string;
  providerVersion: string | null;
  payload: DoclingNormalizedCandidate;
  markdown: string;
  rawJson: unknown;
  stats: DoclingStats | null;
  warnings: string[];
}) {
  const { runId, provider, providerVersion, payload, markdown, rawJson, stats, warnings } = params;
  const courseId = randomUUID();

  await db.insert(doclingTestCourse).values({
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

  await db.insert(doclingTestArtifact).values({
    id: randomUUID(),
    runId,
    markdown,
    rawJson: rawJson as object,
    stats: (stats ?? null) as object | null,
  });

  if (payload.keyConcepts.length > 0) {
    await db.insert(doclingTestConcept).values(
      payload.keyConcepts.map((label, index) => ({
        id: randomUUID(),
        courseId,
        label,
        displayOrder: index,
      })),
    );
  }

  if (payload.contacts.length > 0) {
    await db.insert(doclingTestContact).values(
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
    await db.insert(doclingTestGradingItem).values(
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
    await db.insert(doclingTestAssignment).values(
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
    await db.insert(doclingTestEvent).values(
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
    .update(doclingTestRun)
    .set({
      parseStatus: "completed",
      provider,
      providerVersion,
      backend: getDoclingBackend(),
      warnings,
      updatedAt: new Date(),
    })
    .where(eq(doclingTestRun.id, runId));
}

export async function replaceCurrentDoclingRunWithFailure(
  runId: string,
  userId: string,
  mode: DoclingDocumentMode,
  message: string,
) {
  await db.delete(doclingTestRun).where(eq(doclingTestRun.id, runId));
  await db.insert(doclingTestRun).values({
    id: runId,
    userId,
    contentHash: "",
    originalFileName: "failed-docling-parse",
    mimeType: "application/octet-stream",
    fileSizeBytes: 0,
    mode,
    inputFormat: "pdf",
    parseStatus: "failed",
    provider: "docling",
    providerVersion: null,
    backend: getDoclingBackend(),
    warnings: [message],
  });
}

export async function getDoclingTestViewModel(
  userId: string,
  mode?: DoclingDocumentMode,
): Promise<DoclingTestViewModel | null> {
  const latestRunId = await getLatestCompletedRunId(userId, mode);
  if (!latestRunId) {
    return null;
  }

  return getDoclingTestViewModelForRun(userId, latestRunId);
}

export async function getDoclingTestViewModelForRun(
  userId: string,
  runId: string,
): Promise<DoclingTestViewModel | null> {
  const run = await getRunById(userId, runId);
  if (!run) {
    return null;
  }

  const courses = await db.select().from(doclingTestCourse).where(eq(doclingTestCourse.runId, run.id)).limit(1);
  const course = courses[0];
  if (!course) {
    return null;
  }

  const [artifactRows, concepts, contacts, gradingItems, assignments, events] = await Promise.all([
    db.select().from(doclingTestArtifact).where(eq(doclingTestArtifact.runId, run.id)).limit(1),
    db.select().from(doclingTestConcept).where(eq(doclingTestConcept.courseId, course.id)),
    db.select().from(doclingTestContact).where(eq(doclingTestContact.courseId, course.id)),
    db.select().from(doclingTestGradingItem).where(eq(doclingTestGradingItem.courseId, course.id)),
    db.select().from(doclingTestAssignment).where(eq(doclingTestAssignment.courseId, course.id)),
    db.select().from(doclingTestEvent).where(eq(doclingTestEvent.courseId, course.id)),
  ]);

  const artifact = artifactRows[0];
  if (!artifact) {
    return null;
  }

  const sortedConcepts = [...concepts].sort((a, b) => a.displayOrder - b.displayOrder);
  const sortedContacts = [...contacts].sort((a, b) => a.displayOrder - b.displayOrder);
  const sortedGradingItems = [...gradingItems].sort((a, b) => a.displayOrder - b.displayOrder);
  const sortedAssignments = [...assignments].sort((a, b) => {
    if (a.dueAt && b.dueAt) {
      return a.dueAt.getTime() - b.dueAt.getTime() || a.displayOrder - b.displayOrder;
    }

    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return a.displayOrder - b.displayOrder;
  });
  const sortedEvents = [...events].sort((a, b) => {
    if (a.dueAt && b.dueAt) {
      return a.dueAt.getTime() - b.dueAt.getTime() || a.displayOrder - b.displayOrder;
    }

    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return a.displayOrder - b.displayOrder;
  });

  return {
    run: {
      id: run.id,
      contentHash: run.contentHash,
      parseStatus: run.parseStatus as ParseStatus,
      mode: run.mode as DoclingDocumentMode,
      provider: run.provider,
      providerVersion: run.providerVersion,
      backend: run.backend as DoclingBackend,
      inputFormat: run.inputFormat as DoclingInputFormat,
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
    artifact: {
      markdown: artifact.markdown,
      rawJson: artifact.rawJson,
      stats: artifact.stats as DoclingStats | null,
    },
  };
}

export async function deleteDoclingTestRunRecord(params: { userId: string; runId: string }) {
  const run = await getRunById(params.userId, params.runId);

  if (!run) {
    return null;
  }

  await db.delete(doclingTestRun).where(and(eq(doclingTestRun.id, params.runId), eq(doclingTestRun.userId, params.userId)));
  const nextRunId = await getLatestCompletedRunId(params.userId, run.mode as DoclingDocumentMode);

  return { nextRunId, mode: run.mode as DoclingDocumentMode };
}
