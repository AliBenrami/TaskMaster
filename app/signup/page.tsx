import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getServerSession, isGoogleAuthConfigured } from "@/lib/auth-session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getNextPath(searchParams: Record<string, string | string[] | undefined> | undefined) {
  const nextValue = Array.isArray(searchParams?.next) ? searchParams.next[0] : searchParams?.next;
  return nextValue && nextValue.startsWith("/") ? nextValue : "/parse-test";
}

export default async function SignupPage(props: { searchParams?: SearchParams }) {
  const session = await getServerSession();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const nextPath = getNextPath(searchParams);

  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6 py-12">
      <AuthForm mode="signup" nextPath={nextPath} googleEnabled={isGoogleAuthConfigured()} />
    </main>
  );
}
