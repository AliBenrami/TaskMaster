import type { ParseTestViewModel } from "@/lib/parse-test/contracts";
import { formatTimestamp, uploadStatusLabel } from "./view-helpers";

type TechnicalPanelProps = {
  preview: ParseTestViewModel | null;
  uploadStatusParam: string | undefined;
  displayName: string;
};

export function TechnicalPanel({ preview, uploadStatusParam, displayName }: TechnicalPanelProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Technical details
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Current parse status
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
                <dt className="text-zinc-500 dark:text-zinc-400">Owner</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{displayName}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Parse status</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{preview.run.parseStatus}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Model</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{preview.run.parseModel}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Saved events</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{preview.events.length}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Saved contacts</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{preview.contacts.length}</dd>
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
                No important parser warnings for your current saved preview.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm leading-6 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No saved ParseTest preview yet. Upload a syllabus above to create the SQL-backed class
          page for your account and populate technical details for this module.
        </div>
      )}
    </section>
  );
}
