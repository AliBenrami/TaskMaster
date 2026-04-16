import type { ParseTestViewModel } from "@/lib/parse-test/contracts";
import { ParseTestRunSwitcher } from "../run-switcher";
import {
  descriptionSourceLabel,
  formatDueAt,
  formatPercent,
  getMeetingFallback,
} from "../view-helpers";
import { AssignmentCard } from "./assignment-card";
import { ContactCard } from "./contact-card";

type PreviewPaneProps = {
  preview: ParseTestViewModel;
  metrics: {
    datedAssignmentsCount: number;
    upcomingAssignmentsCount: number;
    nextAssignment: ParseTestViewModel["assignments"][number] | null;
    totalGradedWeight: number;
  };
  gradeDistributionStyle: { background: string };
  currentIndex: number;
  totalCount: number;
  prevRunId: string | null;
  nextRunId: string | null;
};

export function PreviewPane({
  preview,
  metrics,
  gradeDistributionStyle,
  currentIndex,
  totalCount,
  prevRunId,
  nextRunId,
}: PreviewPaneProps) {
  const instructorContacts = preview.contacts.filter((contact) => contact.role !== "TA");
  const teachingAssistants = preview.contacts.filter((contact) => contact.role === "TA");
  const meetingInfo = getMeetingFallback(preview);

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-7 py-8 dark:border-zinc-800">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Generated class preview
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {preview.course.title}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              {preview.course.courseCode ? (
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-white dark:bg-zinc-100 dark:text-zinc-950">
                  {preview.course.courseCode}
                </span>
              ) : null}
              {preview.course.courseSection ? (
                <span className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
                  Section {preview.course.courseSection}
                </span>
              ) : null}
              {preview.course.term ? (
                <span className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
                  {preview.course.term}
                </span>
              ) : null}
              {preview.course.instructorName ? (
                <span className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
                  {preview.course.instructorName}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 lg:items-end">
            <ParseTestRunSwitcher
              currentRunId={preview.run.id}
              currentIndex={currentIndex}
              totalCount={totalCount}
              prevRunId={prevRunId}
              nextRunId={nextRunId}
            />
            <div className="min-w-[240px] rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="font-medium text-zinc-900 dark:text-zinc-50">Meeting info</div>
              <div className="mt-2 text-zinc-600 dark:text-zinc-400">{meetingInfo.primary}</div>
              <div className="mt-1 text-zinc-600 dark:text-zinc-400">{meetingInfo.secondary}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              Upcoming work
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {metrics.upcomingAssignmentsCount}
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Dated milestones still ahead in the current parse.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              Next milestone
            </div>
            <div className="mt-2 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {metrics.nextAssignment?.title ?? "No dated item found"}
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {metrics.nextAssignment
                ? formatDueAt(metrics.nextAssignment.dueAt) ?? metrics.nextAssignment.dateText
                : "The parser did not find a specific upcoming calendar date."}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              Total graded weight
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {formatPercent(metrics.totalGradedWeight)}
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Based on the extracted grading categories.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-7 py-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                What this class is about
              </h3>
              <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {descriptionSourceLabel(preview.course.descriptionSource)}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
              {preview.course.studentSummary}
            </p>

            {preview.course.catalogDescription ? (
              <details className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                <summary className="cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Official description
                </summary>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  {preview.course.catalogDescription}
                </p>
              </details>
            ) : null}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Assignment timeline
              </h3>
              <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {metrics.datedAssignmentsCount} dated item{metrics.datedAssignmentsCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {preview.assignments.length > 0 ? (
                preview.assignments.map((assignment) => (
                  <AssignmentCard key={assignment.id} assignment={assignment} />
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  No assignments were clearly extracted from the current syllabus.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Contacts
              </h3>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {preview.contacts.length} saved
              </span>
            </div>

            {preview.contacts.length > 0 ? (
              <div className="mt-5 space-y-5">
                {instructorContacts.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                      Instructor
                    </div>
                    {instructorContacts.map((contact) => (
                      <ContactCard key={contact.id} contact={contact} />
                    ))}
                  </div>
                ) : null}

                {teachingAssistants.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                      Teaching assistants
                    </div>
                    {teachingAssistants.map((contact) => (
                      <ContactCard key={contact.id} contact={contact} />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                No professor or TA contact details were clearly extracted from the current syllabus.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Course materials
              </h3>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {preview.course.requiredMaterials.length} item
                {preview.course.requiredMaterials.length === 1 ? "" : "s"}
              </span>
            </div>
            {preview.course.requiredMaterials.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {preview.course.requiredMaterials.map((material) => (
                  <li
                    key={material}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {material}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                No required textbooks or materials were clearly extracted.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Homework tools
              </h3>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {preview.course.homeworkTools.length} platform
                {preview.course.homeworkTools.length === 1 ? "" : "s"}
              </span>
            </div>
            {preview.course.homeworkTools.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {preview.course.homeworkTools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-full border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                No homework or course tools were clearly extracted.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Key concepts
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {preview.concepts.length > 0 ? (
                preview.concepts.map((concept) => (
                  <span
                    key={concept.id}
                    className="rounded-full border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    {concept.label}
                  </span>
                ))
              ) : (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">No key concepts extracted.</span>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Grade distribution
              </h3>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {preview.gradingItems.length} categor{preview.gradingItems.length === 1 ? "y" : "ies"}
              </span>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-[140px_1fr] md:items-center">
              <div
                className="mx-auto flex h-32 w-32 items-center justify-center rounded-full p-3"
                style={gradeDistributionStyle}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-center dark:bg-zinc-950">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                      Total
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {formatPercent(metrics.totalGradedWeight)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {preview.gradingItems.length > 0 ? (
                  preview.gradingItems.map((item) => (
                    <div key={item.id}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {formatPercent(item.weightPercent)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-2 rounded-full bg-zinc-950 dark:bg-zinc-100"
                          style={{ width: `${Math.max(0, Math.min(100, item.weightPercent))}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        {item.sourceSnippet}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No grading weights were clearly extracted.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
