import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHero } from "@/components/auth/auth-hero";
import { getServerSession, isGoogleAuthConfigured } from "@/lib/auth-session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getNextPath(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const nextValue = Array.isArray(searchParams?.next)
    ? searchParams.next[0]
    : searchParams?.next;
  return nextValue && nextValue.startsWith("/") ? nextValue : "/";
}

export default async function LoginPage(props: { searchParams?: SearchParams }) {
  const session = await getServerSession();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const nextPath = getNextPath(searchParams);

  if (session) {
    redirect(nextPath);
  }

  return (
    <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      <div className="hidden lg:block">
        <AuthHero
          eyebrow="Welcome back"
          heading="One workspace for your classes, notes, and study sessions."
          tagline="Sign in to pick up where you left off. Your parsed syllabi, class-linked notes, and study tools are right where you saved them."
        />
      </div>

      <div className="flex flex-col justify-center">
        <AuthForm
          mode="login"
          nextPath={nextPath}
          googleEnabled={isGoogleAuthConfigured()}
        />
      </div>
    </div>
  );
}
