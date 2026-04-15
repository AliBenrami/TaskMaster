import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { parseTestRun, doclingTestCourse } from "@/lib/db/schema";
import type {
  DoclingInputFormat,
  DoclingComparisonSummary,
  DoclingTestRunSummary,
  NormalizedDoclingTestSchedule,
} from "../contracts";
import { compareCounts } from "../heuristics";
import { getParseTestViewModelForRun } from "@/lib/parse-test/data/repository";
import { getDoclingTestViewModel, getDoclingTestViewModelForRun, getUserDoclingTestRuns } from "./repository";

export async function getDoclingTestRunSummaries(userId: string): Promise<DoclingTestRunSummary[]> {
  const runs = await getUserDoclingTestRuns(userId);

  if (runs.length === 0) {
    return [];
  }

  const runIds = runs.map((run) => run.id);
  const courses = await db
    .select({
      runId: doclingTestCourse.runId,
      title: doclingTestCourse.title,
      courseCode: doclingTestCourse.courseCode,
      term: doclingTestCourse.term,
    })
    .from(doclingTestCourse)
    .where(inArray(doclingTestCourse.runId, runIds));

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
        inputFormat: run.inputFormat as DoclingInputFormat,
        updatedAt: run.updatedAt.toISOString(),
      } satisfies DoclingTestRunSummary;
    })
    .filter((summary): summary is DoclingTestRunSummary => summary !== null);
}

export async function getNormalizedDoclingTestSchedule(
  userId: string,
): Promise<NormalizedDoclingTestSchedule | null> {
  const preview = await getDoclingTestViewModel(userId);

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

export async function getDoclingComparisonSummary(params: {
  userId: string;
  contentHash: string;
  inputFormat: "pdf" | "docx";
  doclingRunId: string;
}) {
  const doclingPreview = await getDoclingTestViewModelForRun(params.userId, params.doclingRunId);
  if (!doclingPreview) {
    return {
      availability: "unavailable",
      reason: "No saved docling-test preview is available for comparison.",
      parseTestRunId: null,
      counts: [],
    } satisfies DoclingComparisonSummary;
  }

  if (params.inputFormat !== "pdf") {
    return {
      availability: "unavailable",
      reason: "Comparison is only available for PDF uploads because parse-test is PDF-only.",
      parseTestRunId: null,
      counts: [],
    } satisfies DoclingComparisonSummary;
  }

  const parseRuns = await db
    .select()
    .from(parseTestRun)
    .where(
      and(
        eq(parseTestRun.userId, params.userId),
        eq(parseTestRun.contentHash, params.contentHash),
        eq(parseTestRun.parseStatus, "completed"),
      ),
    );

  const parseRun = parseRuns[0] ?? null;
  if (!parseRun) {
    return {
      availability: "unavailable",
      reason: "No matching parse-test PDF run was found for this document hash.",
      parseTestRunId: null,
      counts: [],
    } satisfies DoclingComparisonSummary;
  }

  const parsePreview = await getParseTestViewModelForRun(params.userId, parseRun.id);
  if (!parsePreview) {
    return {
      availability: "unavailable",
      reason: "The matching parse-test run could not be reloaded from SQL.",
      parseTestRunId: parseRun.id,
      counts: [],
    } satisfies DoclingComparisonSummary;
  }

  return {
    availability: "matched",
    reason: "Matched by PDF content hash.",
    parseTestRunId: parseRun.id,
    counts: [
      {
        label: "Concepts",
        docling: doclingPreview.concepts.length,
        parseTest: parsePreview.concepts.length,
        delta: compareCounts(doclingPreview.concepts.length, parsePreview.concepts.length),
      },
      {
        label: "Contacts",
        docling: doclingPreview.contacts.length,
        parseTest: parsePreview.contacts.length,
        delta: compareCounts(doclingPreview.contacts.length, parsePreview.contacts.length),
      },
      {
        label: "Grading",
        docling: doclingPreview.gradingItems.length,
        parseTest: parsePreview.gradingItems.length,
        delta: compareCounts(doclingPreview.gradingItems.length, parsePreview.gradingItems.length),
      },
      {
        label: "Assignments",
        docling: doclingPreview.assignments.length,
        parseTest: parsePreview.assignments.length,
        delta: compareCounts(doclingPreview.assignments.length, parsePreview.assignments.length),
      },
      {
        label: "Events",
        docling: doclingPreview.events.length,
        parseTest: parsePreview.events.length,
        delta: compareCounts(doclingPreview.events.length, parsePreview.events.length),
      },
      {
        label: "Materials",
        docling: doclingPreview.course.requiredMaterials.length,
        parseTest: parsePreview.course.requiredMaterials.length,
        delta: compareCounts(
          doclingPreview.course.requiredMaterials.length,
          parsePreview.course.requiredMaterials.length,
        ),
      },
      {
        label: "Tools",
        docling: doclingPreview.course.homeworkTools.length,
        parseTest: parsePreview.course.homeworkTools.length,
        delta: compareCounts(
          doclingPreview.course.homeworkTools.length,
          parsePreview.course.homeworkTools.length,
        ),
      },
    ],
  } satisfies DoclingComparisonSummary;
}
