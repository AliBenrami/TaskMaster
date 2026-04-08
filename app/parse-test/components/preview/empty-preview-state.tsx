export function EmptyPreviewState() {
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
        upcoming work, and grading structure, all read back from your saved SQL record.
      </p>
    </section>
  );
}
