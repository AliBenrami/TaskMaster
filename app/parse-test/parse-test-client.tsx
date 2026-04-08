"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ParseTestClient({ hasPreview }: { hasPreview: boolean }) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage(null);
      setError("Choose a syllabus PDF before starting the parse.");
      return;
    }

    setIsUploading(true);
    setMessage("Parsing the syllabus and saving the singleton preview to SQL.");

    try {
      const response = await fetch("/api/parse-test", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; isDuplicate?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "ParseTest could not parse the uploaded syllabus.");
      }

      const uploadStatus = payload?.isDuplicate ? "duplicate" : "parsed";
      setMessage(
        payload?.isDuplicate
          ? "This syllabus matches the current singleton record. Reloading the saved SQL preview."
          : "Syllabus parsed and saved to SQL. Reloading the preview from the database now.",
      );

      startTransition(() => {
        router.replace(`/parse-test?upload=${uploadStatus}`);
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

  const isBusy = isUploading || isNavigating;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-zinc-200 bg-white/92 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/90 lg:aspect-square">
      <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,_rgba(24,24,27,0.08),_transparent_70%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(244,244,245,0.08),_transparent_70%)]" />
      <div className="relative flex h-full flex-col p-6 sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
            ParseTest
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Upload one syllabus and replace the singleton preview
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            This panel is the parsing workbench. Drop in a syllabus, run Gemini, save the
            extracted course graph to SQL, and refresh the class-page preview on the right.
          </p>
        </div>

        <form action={handleSubmit} className="mt-6 flex flex-1 flex-col gap-5">
          <label className="group flex min-h-52 flex-1 cursor-pointer flex-col justify-between rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50/90 p-5 transition hover:border-zinc-500 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-zinc-500 dark:hover:bg-zinc-950">
            <div>
              <div className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                Syllabus PDF
              </div>
              <div className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Drop a syllabus here or browse from your device
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                ParseTest currently accepts one PDF up to 20 MB and keeps only one saved class
                graph in SQL.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <div className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                Choose PDF
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
                }}
              />
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                PDF only · singleton SQL preview
              </p>
            </div>
          </label>

          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Selected file
            </div>
            <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {selectedFileName || "No syllabus chosen yet"}
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {hasPreview
                ? "Uploading a different syllabus replaces the current SQL-backed preview. Uploading the same PDF reuses it."
                : "The first successful upload will create the singleton ParseTest preview in SQL."}
            </p>
          </div>

          <div
            aria-live="polite"
            className="rounded-[24px] border border-zinc-200 bg-white/90 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950/80"
          >
            {error ? (
              <div className="text-rose-600 dark:text-rose-400">{error}</div>
            ) : message ? (
              <div className="text-zinc-700 dark:text-zinc-300">{message}</div>
            ) : (
              <div className="text-zinc-500 dark:text-zinc-400">
                Idle. Select a syllabus PDF to generate a fresh class-page preview.
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
          >
            {isBusy ? "Parsing and saving..." : "Parse and save preview"}
          </button>
        </form>
      </div>
    </section>
  );
}
