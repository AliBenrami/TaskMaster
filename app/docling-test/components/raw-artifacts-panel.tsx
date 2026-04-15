import type { DoclingTestViewModel } from "@/lib/docling-test/contracts";

function serializeArtifact(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function RawArtifactsPanel({ preview }: { preview: DoclingTestViewModel | null }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        Raw artifacts
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Literal Docling markdown and JSON
      </h2>

      {!preview ? (
        <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Upload a document to persist the raw Docling markdown and JSON artifacts for inspection.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Markdown
            </h3>
            <pre className="mt-4 max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-zinc-200 bg-white p-4 text-xs leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              {preview.artifact.markdown || "No markdown output was saved for this run."}
            </pre>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              JSON artifact
            </h3>
            <pre className="mt-4 max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-zinc-200 bg-white p-4 text-xs leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              {serializeArtifact(preview.artifact.rawJson)}
            </pre>
          </section>
        </div>
      )}
    </section>
  );
}
