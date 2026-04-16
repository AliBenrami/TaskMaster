import type { DoclingTestViewModel } from "@/lib/docling-test/contracts";
import { formatTimestamp } from "@/app/parse-test/components/view-helpers";

type TechnicalPanelProps = {
  preview: DoclingTestViewModel | null;
  uploadStatusParam: string | undefined;
  displayName: string;
};

function uploadStatusLabel(uploadStatus: string | undefined) {
  switch (uploadStatus) {
    case "duplicate":
      return "Duplicate reuse";
    case "parsed":
      return "Fresh parse";
    case "deleted":
      return "Deleted";
    default:
      return "No recent upload";
  }
}

export function TechnicalPanel({ preview, uploadStatusParam, displayName }: TechnicalPanelProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Technical details
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Current Docling run status
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
                <dt className="text-zinc-500 dark:text-zinc-400">Mode</dt>
                <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-100">{preview.run.mode}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Provider</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{preview.run.provider}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Provider version</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {preview.run.providerVersion || "Unknown"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Backend</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{preview.run.backend}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Input format</dt>
                <dd className="font-medium uppercase text-zinc-900 dark:text-zinc-100">
                  {preview.run.inputFormat}
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
              Parser notes and artifact stats
            </h3>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                Pages: {preview.artifact.stats?.pageCount ?? "Unknown"}
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                Tables: {preview.artifact.stats?.tableCount ?? "Unknown"}
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                Images: {preview.artifact.stats?.pictureCount ?? "Unknown"}
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                Formulas: {preview.artifact.stats?.formulaCount ?? "Unknown"}
              </div>
            </div>

            {preview.run.warnings.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {preview.run.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                No important parser warnings for your current saved Docling run.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm leading-6 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No saved docling-test preview yet. Upload a document above to create the SQL-backed preview and raw artifact record for your account.
        </div>
      )}
    </section>
  );
}
