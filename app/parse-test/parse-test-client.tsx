"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ParseTestViewModel } from "@/lib/parse-test/contracts";

type ParseTestClientProps = {
  hasPreview: boolean;
  courseTitle: string | null;
  events: ParseTestViewModel["events"];
  savedAt: string | null;
  totalSavedClasses: number;
};

function formatDisplayDate(dueAt: string | null, dateText: string) {
  if (!dueAt) {
    return dateText;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dueAt));
}

function formatSavedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function slugifyFilePart(value: string | null) {
  const base = (value || "parse-test-events")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "parse-test-events";
}

type ParseStreamEvent =
  | { type: "start" }
  | { type: "log"; message: string }
  | { type: "result"; ok: true; isDuplicate?: boolean; runId?: string }
  | { type: "error"; error: string; status?: number };

export function ParseTestClient({
  hasPreview,
  courseTitle,
  events,
  savedAt,
  totalSavedClasses,
}: ParseTestClientProps) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<string[]>([]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setExportMessage(null);
    setActivityLogs([]);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage(null);
      setError("Choose a syllabus PDF before starting the parse.");
      return;
    }

    setIsUploading(true);
    setMessage("Parsing the syllabus and saving your preview to SQL.");
    setActivityLogs([
      `Selected file: ${file.name}`,
      "Submitting the upload to the ParseTest API.",
      "Waiting for local validation, duplicate detection, Gemini, and SQL persistence.",
    ]);

    try {
      const response = await fetch("/api/parse-test", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; logs?: string[] }
          | null;
        setActivityLogs(payload?.logs ?? []);
        throw new Error(payload?.error || "ParseTest could not parse the uploaded syllabus.");
      }

      if (!response.body) {
        throw new Error("ParseTest did not return a readable activity stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: Extract<ParseStreamEvent, { type: "result" }> | null = null;
      let streamError: string | null = null;

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            continue;
          }

          const event = JSON.parse(trimmed) as ParseStreamEvent;

          if (event.type === "log") {
            setActivityLogs((current) => current.concat(event.message));
            continue;
          }

          if (event.type === "error") {
            streamError = event.error;
          }

          if (event.type === "result") {
            finalResult = event;
          }
        }
      }

      if (buffer.trim()) {
        const event = JSON.parse(buffer.trim()) as ParseStreamEvent;
        if (event.type === "log") {
          setActivityLogs((current) => current.concat(event.message));
        } else if (event.type === "error") {
          streamError = event.error;
        } else if (event.type === "result") {
          finalResult = event;
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }

      if (!finalResult) {
        throw new Error("ParseTest finished without a final result.");
      }

      const uploadStatus = finalResult.isDuplicate ? "duplicate" : "parsed";
      setMessage(
        finalResult.isDuplicate
          ? "This syllabus matches your current saved record. Reloading the SQL preview."
          : "Syllabus parsed and saved to SQL. Reloading the preview from the database now.",
      );
      setActivityLogs((current) => current.concat("Refreshing the page with the saved SQL-backed preview."));

      startTransition(() => {
        const nextUrl = finalResult.runId
          ? `/parse-test?run=${encodeURIComponent(finalResult.runId)}&upload=${uploadStatus}`
          : `/parse-test?upload=${uploadStatus}`;
        router.replace(nextUrl);
        router.refresh();
      });
    } catch (submissionError) {
      setMessage(null);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "ParseTest hit an unexpected upload error.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleExport() {
    if (events.length === 0) {
      setExportMessage("No saved events are available to export yet.");
      return;
    }

    const payload = {
      course: courseTitle,
      exportedAt: new Date().toISOString(),
      events: events.map((event) => ({
        title: event.title,
        category: event.category,
        isoDate: event.dueAt,
        dateText: event.dateText,
        timeText: event.timeText,
        location: event.location,
        sourceSnippet: event.sourceSnippet,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugifyFilePart(courseTitle)}-events.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    setExportMessage("UTF-8 JSON export downloaded from the saved SQL event feed.");
  }

  const isBusy = isUploading || isNavigating;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:min-h-[420px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
            ParseTest
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Upload one syllabus and refresh your saved preview
          </h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            Upload a syllabus PDF, run Gemini, save the extracted data to SQL, and refresh the
            class page preview from your saved record.
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            {totalSavedClasses} saved class{totalSavedClasses === 1 ? "" : "es"}
          </p>
        </div>

        <form action={handleSubmit} className="mt-6 space-y-4">
          <label className="block cursor-pointer rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-5 transition hover:border-zinc-400 hover:bg-zinc-100/70 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/80">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                Syllabus PDF
              </div>
              <div className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Choose a syllabus from your device
              </div>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                ParseTest accepts one PDF up to 20 MB and keeps each saved syllabus graph tied to
                your account.
              </p>
              <div className="inline-flex rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">
                Browse files
              </div>
            </div>
            <input
              className="sr-only"
              type="file"
              name="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                setSelectedFileName(file?.name ?? null);
                setMessage(null);
                setError(null);
                setActivityLogs([]);
              }}
            />
          </label>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              Selected file
            </div>
            <div className="mt-2 break-words text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {selectedFileName || "No syllabus chosen yet"}
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {hasPreview
                ? "Uploading a different syllabus creates another saved class. Uploading the same PDF reuses the existing one."
                : "The first successful upload will create your ParseTest preview in SQL."}
            </p>
          </div>

          <div
            aria-live="polite"
            className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            {error ? (
              <div className="text-rose-600 dark:text-rose-400">{error}</div>
            ) : message ? (
              <div className="text-zinc-700 dark:text-zinc-300">{message}</div>
            ) : (
              <div className="text-zinc-500 dark:text-zinc-400">
                Idle. Select a syllabus PDF to generate or refresh your saved preview.
              </div>
            )}

            {activityLogs.length > 0 ? (
              <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    Live activity
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                    {isBusy ? "Running" : "Complete"}
                  </div>
                </div>
                <ol className="mt-3 space-y-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                  {activityLogs.map((log, index) => {
                    const isLatest = index === activityLogs.length - 1;

                    return (
                      <li
                        key={`${index}-${log}`}
                        className={`flex gap-3 rounded-xl px-3 py-2 ${
                          isLatest
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                            : ""
                        }`}
                      >
                        <span className="min-w-5 text-zinc-400 dark:text-zinc-500">{index + 1}.</span>
                        <span>{log}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
          >
            {isBusy ? "Parsing and saving..." : "Parse and save preview"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Extracted dates
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Saved event feed
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Every explicit calendar-dated item saved from your current ParseTest parse.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            Export UTF-8 JSON
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
          <span>{events.length} saved event{events.length === 1 ? "" : "s"}</span>
          {savedAt ? <span>Updated {formatSavedAt(savedAt)}</span> : null}
        </div>

        {exportMessage ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {exportMessage}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {events.length > 0 ? (
            events.map((event) => (
              <article
                key={event.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                        {event.category}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {event.title}
                    </div>
                    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {event.sourceSnippet}
                    </p>
                  </div>

                  <div className="min-w-40 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatDisplayDate(event.dueAt, event.dateText)}
                    </div>
                    {event.timeText ? (
                      <div className="mt-1 text-zinc-500 dark:text-zinc-400">{event.timeText}</div>
                    ) : null}
                    {event.location ? (
                      <div className="mt-1 text-zinc-500 dark:text-zinc-400">{event.location}</div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-sm leading-6 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No saved event feed yet. Upload a syllabus with explicit calendar dates to populate
              this list and enable export.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
