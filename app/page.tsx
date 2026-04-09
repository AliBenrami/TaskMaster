import Link from "next/link";
import { getServerSession } from "@/lib/auth-session";

export default async function Home() {
  const session = await getServerSession();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-12">
      <main className="w-full rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold tracking-tight">TaskMaster</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Syllabus parsing now runs through an authenticated ParseTest workspace. Use the base agent
          endpoint at <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">/api/chat</code> for the chat foundation.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/parse-test"
            className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
          >
            Open ParseTest
          </Link>
          {session ? (
            <span className="inline-flex rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              Signed in as {session.user.name || session.user.email}
            </span>
          ) : (
            <>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
