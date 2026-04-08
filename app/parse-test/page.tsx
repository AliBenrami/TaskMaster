import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ParseTestClient } from "./parse-test-client";
import type { ParseTestViewModel } from "@/lib/parse-test/contracts";
import { isParseTestEnabled } from "@/lib/parse-test/feature";
import { getParseTestViewModel } from "@/lib/parse-test/service";

function formatDueAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPercent(value: number | null) {
  if (value == null) {
    return null;
  }

  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function descriptionSourceLabel(source: string) {
  switch (source) {
    case "catalog_description":
      return "Official catalog description";
    case "course_objectives":
      return "Course objectives";
    case "learning_outcomes":
      return "Learning outcomes";
    default:
      return "Inferred from topics";
  }
}

function uploadStatusLabel(uploadStatus: string | undefined) {
  switch (uploadStatus) {
    case "duplicate":
      return "Duplicate reuse";
    case "parsed":
      return "Fresh parse";
    default:
      return "No recent upload";
  }
}

function getPreviewMetrics(preview: ParseTestViewModel) {
  const today = new Date();
  const datedAssignments = preview.assignments.filter((assignment) => assignment.dueAt);
  const upcomingAssignments = datedAssignments.filter(
    (assignment) => assignment.dueAt && new Date(assignment.dueAt).getTime() >= today.getTime(),
  );
  const nextAssignment = upcomingAssignments[0] ?? datedAssignments[0] ?? null;
  const totalGradedWeight = preview.gradingItems.reduce((sum, item) => sum + item.weightPercent, 0);

  return {
    datedAssignmentsCount: datedAssignments.length,
    upcomingAssignmentsCount: upcomingAssignments.length,
    nextAssignment,
    totalGradedWeight,
  };
}

function getGradeDistributionStyle(items: ParseTestViewModel["gradingItems"]) {
  if (items.length === 0) {
    return {
      background: "conic-gradient(from 180deg, rgba(228,228,231,1) 0deg 360deg)",
    };
  }

  const colors = ["#18181b", "#52525b", "#71717a", "#a1a1aa", "#d4d4d8", "#3f3f46"];

  let current = 0;
  const segments = items.map((item, index) => {
    const start = current;
    current += Math.max(0, item.weightPercent);
    return `${colors[index % colors.length]} ${start}% ${current}%`;
  });

  if (current < 100) {
    segments.push(`#e4e4e7 ${current}% 100%`);
  }

  return {
    background: `conic-gradient(from 180deg, ${segments.join(", ")})`,
  };
}

function ContactCard({ contact }: { contact: ParseTestViewModel["contacts"][number] }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{contact.name}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            {contact.role}
          </div>
        </div>
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            {contact.email}
          </a>
        ) : null}
      </div>

      {contact.officeHours || contact.location ? (
        <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          {contact.officeHours ? <div>Office hours: {contact.officeHours}</div> : null}
          {contact.location ? <div>Location: {contact.location}</div> : null}
        </div>
      ) : null}
    </article>
  );
}

function AssignmentCard({ assignment }: { assignment: ParseTestViewModel["assignments"][number] }) {
  const primaryDate = formatDueAt(assignment.dueAt) ?? assignment.dateText;
  const secondaryDate =
    assignment.timeText && assignment.timeText !== assignment.dateText ? assignment.timeText : null;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white dark:bg-zinc-100 dark:text-zinc-950">
              {assignment.category}
            </span>
            {assignment.weightPercent != null ? (
              <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {formatPercent(assignment.weightPercent)} of grade
              </span>
            ) : null}
          </div>
          <h4 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            {assignment.title}
          </h4>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {assignment.sourceSnippet}
          </p>
        </div>

        <div className="min-w-40 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="font-medium text-zinc-900 dark:text-zinc-100">{primaryDate}</div>
          {secondaryDate ? (
            <div className="mt-1 text-zinc-500 dark:text-zinc-400">{secondaryDate}</div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyPreviewState() {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        Potential class page
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Your saved syllabus preview will render here
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
        ParseTest will turn the uploaded syllabus into a class page with course context, contacts,
        upcoming work, and grading structure, all read back from the singleton SQL record.
      </p>
    </section>
  );
}

function PreviewPane({
  preview,
  metrics,
  gradeDistributionStyle,
}: {
  preview: ParseTestViewModel;
  metrics: ReturnType<typeof getPreviewMetrics>;
  gradeDistributionStyle: ReturnType<typeof getGradeDistributionStyle>;
}) {
  const instructorContacts = preview.contacts.filter((contact) => contact.role !== "TA");
  const teachingAssistants = preview.contacts.filter((contact) => contact.role === "TA");

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

          <div className="min-w-[240px] rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="font-medium text-zinc-900 dark:text-zinc-50">Meeting info</div>
            <div className="mt-2 text-zinc-600 dark:text-zinc-400">
              {preview.course.meetingDays || preview.course.meetingTime
                ? [preview.course.meetingDays, preview.course.meetingTime].filter(Boolean).join(" / ")
                : "Meeting days and time not clearly found"}
            </div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-400">
              {preview.course.meetingLocation || "Location not clearly found"}
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
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  No key concepts extracted.
                </span>
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
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.label}
                        </span>
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

export default async function ParseTestPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();

  if (!isParseTestEnabled()) {
    notFound();
  }

  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const uploadStatusParam = Array.isArray(searchParams?.upload)
    ? searchParams.upload[0]
    : searchParams?.upload;
  const preview = await getParseTestViewModel();
  const metrics = preview ? getPreviewMetrics(preview) : null;
  const gradeDistributionStyle = preview ? getGradeDistributionStyle(preview.gradingItems) : null;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
              TaskMaster Prototype
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">ParseTest</h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            Back home
          </Link>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <ParseTestClient
            hasPreview={Boolean(preview)}
            courseTitle={preview?.course.title ?? null}
            events={preview?.events ?? []}
            savedAt={preview?.run.updatedAt ?? null}
          />

          {preview && metrics && gradeDistributionStyle ? (
            <PreviewPane
              preview={preview}
              metrics={metrics}
              gradeDistributionStyle={gradeDistributionStyle}
            />
          ) : (
            <EmptyPreviewState />
          )}
        </div>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Technical details
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Current singleton status
              </h2>
            </div>
            <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {uploadStatusLabel(uploadStatusParam)}
            </span>
          </div>

          {preview ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <dl className="grid gap-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Upload result</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                      {uploadStatusLabel(uploadStatusParam)}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Parse status</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                      {preview.run.parseStatus}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Model</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                      {preview.run.parseModel}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Saved events</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                      {preview.events.length}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Saved contacts</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                      {preview.contacts.length}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Saved at</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatTimestamp(preview.run.updatedAt)}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Content hash</dt>
                    <dd className="max-w-60 break-all text-right font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {preview.run.contentHash}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Run ID</dt>
                    <dd className="max-w-60 break-all text-right font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {preview.run.id}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Parser notes
                </h3>
                {preview.run.warnings.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {preview.run.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    No important parser warnings for the current singleton preview.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm leading-6 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              No saved ParseTest preview yet. Upload a syllabus above to create the singleton
              SQL-backed class page and populate technical details for this module.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
