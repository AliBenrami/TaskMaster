"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type ParseTestClientProps = {
  hasPreview: boolean;
};

export function ParseTestClient({ hasPreview }: ParseTestClientProps) {
  const router = useRouter();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsUploading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/parse-test", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as
        | { ok: true; isDuplicate: boolean }
        | { error?: string };

      if (!response.ok || !("ok" in data)) {
        const errorMessage =
          "error" in data ? data.error : "ParseTest failed to upload the syllabus.";
        throw new Error(errorMessage ?? "ParseTest failed to upload the syllabus.");
      }

      setMessage(
        data.isDuplicate
          ? "That exact PDF is already the current ParseTest preview. SQL data was reused."
          : "Syllabus parsed and saved to SQL. Reloading the preview from the database now.",
      );

      startTransition(() => {
        const params = new URLSearchParams({
          upload: data.isDuplicate ? "duplicate" : "parsed",
          at: Date.now().toString(),
        });
        router.replace(`/parse-test?${params.toString()}`);
      });
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : "ParseTest failed to upload the syllabus.";
      setError(nextError);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            ParseTest
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Upload one syllabus and replace the singleton preview
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            ParseTest keeps only one saved syllabus graph in SQL. Uploading a different PDF
            deletes the previous preview data first; uploading the same PDF reuses the current
            record.
          </p>
        </div>
        <div className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {hasPreview ? "Saved preview loaded from SQL" : "No saved preview yet"}
        </div>
      </div>

      <form
        className="mt-6 grid gap-4 rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-700 dark:bg-zinc-900/70"
        action={handleSubmit}
      >
        <label
          htmlFor="parse-test-file"
          className="text-sm font-medium tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          Syllabus PDF
        </label>
        <input
          id="parse-test-file"
          name="file"
          type="file"
          accept=".pdf,application/pdf"
          required
          disabled={isUploading}
          onChange={(event) => {
            const nextFile = event.currentTarget.files?.[0] ?? null;
            setSelectedFileName(nextFile?.name ?? null);
            setMessage(null);
            setError(null);
          }}
          className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-700 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:file:bg-zinc-100 dark:file:text-zinc-900 dark:hover:file:bg-zinc-300"
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-h-6 text-sm text-zinc-500 dark:text-zinc-400">
            {selectedFileName ? `Selected: ${selectedFileName}` : "PDF only, max 20 MB."}
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-300"
          >
            {isUploading ? "Parsing syllabus..." : "Parse and save preview"}
          </button>
        </div>
      </form>

      {message ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
