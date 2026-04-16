import type { DoclingDocumentMode } from "@/lib/docling-test/contracts";

export function EmptyPreviewState({ mode }: { mode: DoclingDocumentMode }) {
  const previewLabel =
    mode === "notes" ? "note preview" : mode === "presentation" ? "presentation preview" : "class preview";
  const description =
    mode === "notes"
      ? "docling-test turns the uploaded document into a note-style preview with detected topics, dated references, study tools, and a technical artifact record stored in SQL."
      : mode === "presentation"
        ? "docling-test turns the uploaded document into a presentation-style preview with extracted topics, dated milestones, references, and a technical artifact record stored in SQL."
        : "docling-test turns the uploaded document into a class-style preview with course context, contacts, upcoming work, grading structure, and a technical artifact record stored in SQL.";

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        Potential preview
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Your saved Docling {previewLabel} will render here
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </section>
  );
}
