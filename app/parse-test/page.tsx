import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ParseTestClient } from "./parse-test-client";
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(244,244,245,0.96),_rgba(255,255,255,1)_40%,_rgba(250,250,250,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(39,39,42,0.55),_rgba(10,10,10,1)_45%,_rgba(0,0,0,1)_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
              TaskMaster Prototype
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">ParseTest</h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
          >
            Back home
          </Link>
        </div>

        <ParseTestClient hasPreview={Boolean(preview)} />

        {preview ? (
          <section className="grid gap-6">
            <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="border-b border-zinc-200 bg-[linear-gradient(135deg,rgba(244,244,245,0.95),rgba(255,255,255,0.8))] px-7 py-8 dark:border-zinc-800 dark:bg-[linear-gradient(135deg,rgba(39,39,42,0.88),rgba(9,9,11,1))]">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      Generated class preview
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {preview.course.title}
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                      {preview.course.courseCode ? (
                        <span className="rounded-full bg-zinc-900 px-3 py-1 text-white dark:bg-zinc-100 dark:text-zinc-900">
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

                  <div className="grid gap-2 rounded-[24px] border border-zinc-200 bg-white/80 p-5 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">Meeting info</div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      {preview.course.meetingDays || preview.course.meetingTime
                        ? [preview.course.meetingDays, preview.course.meetingTime]
                            .filter(Boolean)
                            .join(" / ")
                        : "Meeting days and time not clearly found"}
                    </div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      {preview.course.meetingLocation || "Location not clearly found"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 px-7 py-8 lg:grid-cols-[1.3fr_0.9fr]">
                <div className="space-y-6">
                  <section className="rounded-[24px] border border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold tracking-tight">What this class is about</h3>
                      <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs uppercase tracking-[0.18em] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
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

                  <section className="rounded-[24px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                    <h3 className="text-lg font-semibold tracking-tight">Assignment timeline</h3>
                    <div className="mt-5 grid gap-3">
                      {preview.assignments.length > 0 ? (
                        preview.assignments.map((assignment) => (
                          <article
                            key={assignment.id}
                            className="rounded-[22px] border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white dark:bg-zinc-100 dark:text-zinc-900">
                                    {assignment.category}
                                  </span>
                                  <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                    Confidence {Math.round(assignment.confidence * 100)}%
                                  </span>
                                  {assignment.weightPercent != null ? (
                                    <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                      {assignment.weightPercent}% of grade
                                    </span>
                                  ) : null}
                                </div>
                                <h4 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                                  {assignment.title}
                                </h4>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                  {assignment.sourceSnippet}
                                </p>
                              </div>

                              <div className="min-w-44 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {formatDueAt(assignment.dueAt) ?? assignment.dateText}
                                </div>
                                <div className="mt-1 text-zinc-500 dark:text-zinc-400">
                                  {assignment.timeText ?? assignment.dateText}
                                </div>
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                          No assignments were confidently extracted from the current syllabus.
                        </p>
                      )}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-[24px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                    <h3 className="text-lg font-semibold tracking-tight">Key concepts</h3>
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

                  <section className="rounded-[24px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                    <h3 className="text-lg font-semibold tracking-tight">Grading breakdown</h3>
                    <div className="mt-5 space-y-4">
                      {preview.gradingItems.length > 0 ? (
                        preview.gradingItems.map((item) => (
                          <div key={item.id}>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                {item.label}
                              </span>
                              <span className="text-zinc-500 dark:text-zinc-400">
                                {item.weightPercent}%
                              </span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                              <div
                                className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-100"
                                style={{
                                  width: `${Math.max(0, Math.min(100, item.weightPercent))}%`,
                                }}
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
                  </section>

                  <section className="rounded-[24px] border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/70">
                    <h3 className="text-lg font-semibold tracking-tight">Debug strip</h3>
                    <dl className="mt-4 grid gap-3 text-sm">
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
                        <dt className="text-zinc-500 dark:text-zinc-400">Content hash</dt>
                        <dd className="max-w-56 break-all text-right font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {preview.run.contentHash}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-zinc-500 dark:text-zinc-400">Saved at</dt>
                        <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                          {formatTimestamp(preview.run.updatedAt)}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-zinc-500 dark:text-zinc-400">Run ID</dt>
                        <dd className="max-w-56 break-all text-right font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {preview.run.id}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Parser warnings
                      </div>
                      {preview.run.warnings.length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                          {preview.run.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                          No parser warnings for the current singleton preview.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-[32px] border border-dashed border-zinc-300 bg-white/80 p-10 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-950/80">
            <h2 className="text-2xl font-semibold tracking-tight">No saved ParseTest preview yet</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              Upload a syllabus above to run Gemini, persist the extracted class data to SQL,
              and render the resulting class-page preview from the singleton ParseTest tables.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

