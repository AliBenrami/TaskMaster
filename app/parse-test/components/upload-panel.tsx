import type { ChangeEvent } from "react";
import { ActivityLog } from "./activity-log";

type UploadPanelProps = {
  hasPreview: boolean;
  totalSavedClasses: number;
  selectedFileName: string | null;
  isBusy: boolean;
  message: string | null;
  error: string | null;
  activityLogs: string[];
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (formData: FormData) => Promise<void>;
};

export function UploadPanel({
  hasPreview,
  totalSavedClasses,
  selectedFileName,
  isBusy,
  message,
  error,
  activityLogs,
  onFileChange,
  onSubmit,
}: UploadPanelProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:min-h-[420px]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
          ParseTest
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Upload one syllabus and refresh your saved preview
        </h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          Upload a syllabus PDF, run Gemini, save the extracted data to SQL, and refresh the class
          page preview from your saved record.
        </p>
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
          {totalSavedClasses} saved class{totalSavedClasses === 1 ? "" : "es"}
        </p>
      </div>

      <form action={onSubmit} className="mt-6 space-y-4">
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
            onChange={onFileChange}
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

          <ActivityLog logs={activityLogs} isBusy={isBusy} />
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
  );
}
