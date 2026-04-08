import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const isGoogleAuthConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const getServerSession = cache(async () => {
  const requestHeaders = new Headers(await headers());
  return auth.api.getSession({
    headers: requestHeaders,
  });
});

export async function requireServerSession(nextPath = "/parse-test") {
  const session = await getServerSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
}
