import Link from "next/link";
import { getServerSession } from "@/lib/auth-session";

export default async function Home() {
  const session = await getServerSession();
  const quickLinks = [
    {
      href: "/parse-test",
      eyebrow: "Gemini",
      title: "ParseTest",
      description: "Primary syllabus parsing workspace for structured course extraction.",
    },
    {
      href: "/docling-test?mode=syllabus",
      eyebrow: "Docling",
      title: "Docling Syllabuses",
      description: "Experimental syllabus parsing path with raw markdown and JSON inspection.",
    },
    {
      href: "/docling-test?mode=notes",
      eyebrow: "Docling",
      title: "Docling Notes",
      description: "Upload notes and inspect extracted topics, dated references, and technical artifacts.",
    },
    {
      href: "/docling-test?mode=presentation",
      eyebrow: "Docling",
      title: "Docling Presentations",
      description: "Upload presentation PDFs and inspect slide-derived structure and normalized output.",
    },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
      <main className="w-full rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
              TaskMaster
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Parsing workspaces</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              ParseTest remains the primary syllabus parser. DoclingTest now exposes separate modes for
              syllabuses, notes, and presentation PDFs so you can inspect normalized output plus the raw
              technical artifacts behind each run.
            </p>
          </div>

          {session ? (
            <span className="inline-flex rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              Signed in as {session.user.name || session.user.email}
            </span>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-3xl border border-zinc-200 bg-zinc-50 p-5 transition hover:border-zinc-400 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/80"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                {link.eyebrow}
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-zinc-950 transition group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-zinc-200">
                {link.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{link.description}</p>
              <div className="mt-5 inline-flex rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                Open workspace
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
          The base agent endpoint remains available at{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">/api/chat</code>.
        </p>
      </main>
    </div>
  );
}
