import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getServerSession, isGoogleAuthConfigured } from "@/lib/auth-session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getNextPath(searchParams: Record<string, string | string[] | undefined> | undefined) {
  const nextValue = Array.isArray(searchParams?.next) ? searchParams.next[0] : searchParams?.next;
  return nextValue && nextValue.startsWith("/") ? nextValue : "/parse-test";
}

function getWorkspaceLabel(nextPath: string) {
  if (nextPath.startsWith("/notes")) {
    return "notes";
  }

  if (nextPath.startsWith("/parse-test")) {
    return "ParseTest";
  }

  return "TaskMaster";
}

export default async function LoginPage(props: { searchParams?: SearchParams }) {
  const session = await getServerSession();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const nextPath = getNextPath(searchParams);
  const workspaceLabel = getWorkspaceLabel(nextPath);

  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-12">
      <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {workspaceLabel === "notes" ? "Notes workspace" : "Syllabus upload"}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            {workspaceLabel === "notes"
              ? "Sign in to open your notes workspace"
              : "Sign in to save parsed syllabi under your account"}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-600">
            {workspaceLabel === "notes"
              ? "Notes are account-scoped. Each signed-in user gets their own editable notes library, uploaded file records, and saved editor state."
              : "ParseTest is now account-scoped. Each signed-in user gets their own saved syllabus preview, contacts, events, and grading structure."}
          </p>
          <div className="mt-8 space-y-3 text-sm text-zinc-600">
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
              Email/password and Google sign-in are both supported.
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
              {workspaceLabel === "notes"
                ? "Manual notes and imported files are tied to your user record instead of a shared workspace."
                : "Uploads are tied to your user record instead of one global singleton row."}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
              After sign-in, you will return to <code>{nextPath}</code>.
            </div>
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950"
          >
            Back home
          </Link>
        </section>

        <AuthForm mode="login" nextPath={nextPath} googleEnabled={isGoogleAuthConfigured()} />
      </div>
    </main>
  );
}
