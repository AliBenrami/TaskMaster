import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl px-6 py-10 md:px-10">
      <main className="flex w-full flex-col justify-center">
        <div className="max-w-2xl space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              TaskMaster
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Editor and Markdown preview routes
            </h1>
            <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              The editor harness now lives on its own route so the root page can stay lightweight
              and act as an entry point.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/editor-harness"
              className="inline-flex items-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
            >
              Open editor harness
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
