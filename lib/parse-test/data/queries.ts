import type { NormalizedParseTestSchedule, ParseTestRunSummary } from "../contracts";
import { getParseTestViewModel, getUserParseTestRuns } from "./repository";
import { parseTestCourse } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { inArray } from "drizzle-orm";

export async function getParseTestRunSummaries(userId: string): Promise<ParseTestRunSummary[]> {
  const runs = await getUserParseTestRuns(userId);

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
