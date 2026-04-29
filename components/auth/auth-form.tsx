"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WordMark } from "@/components/auth/auth-hero";

type AuthFormProps = {
  mode: "login" | "signup";
  nextPath: string;
  googleEnabled: boolean;
};

function serializeDebugValue(value: unknown) {
  if (value instanceof Error) {
    const errorRecord = value as unknown as Record<string, unknown>;
    const withProps = Object.fromEntries(
      Object.getOwnPropertyNames(value).map((key) => [key, errorRecord[key]]),
    );

    return JSON.stringify(
      {
        name: value.name,
        message: value.message,
        stack: value.stack,
        cause: value.cause,
        ...withProps,
      },
      null,
      2,
    );
  }

  if (value && typeof value === "object") {
    try {
      return JSON.stringify(
        {
          ...Object.fromEntries(
            Object.getOwnPropertyNames(value).map((key) => [key, (value as Record<string, unknown>)[key]]),
          ),
          ...value,
        },
        null,
        2,
      );
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export function AuthForm({ mode, nextPath, googleEnabled }: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [debugDetails, setDebugDetails] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function handleEmailAuth(formData: FormData) {
    setDebugDetails(null);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const nameValue = typeof name === "string" ? name.trim() : "";
    const emailValue = typeof email === "string" ? email.trim() : "";

    if ((isSignup && typeof name !== "string") || typeof email !== "string" || typeof password !== "string") {
      setMessage(null);
      setError("Fill in the required fields before continuing.");
      return;
    }

    setError(null);
    setMessage(isSignup ? "Creating your account." : "Signing you in.");

    try {
      const result = isSignup
        ? await authClient.signUp.email({
            name: nameValue,
            email: emailValue,
            password,
          })
        : await authClient.signIn.email({
            email: emailValue,
            password,
          });

      if (result.error) {
        setDebugDetails(serializeDebugValue(result.error));
        throw new Error(result.error.message || "Authentication failed.");
      }

      startTransition(() => {
        router.replace(nextPath);
        router.refresh();
      });
    } catch (authError) {
      setMessage(null);
      setDebugDetails(serializeDebugValue(authError));
      setError(
        getErrorMessage(
          authError,
          isSignup ? "Could not create the account." : "Could not sign you in.",
        ),
      );
    }
  }

  async function handleGoogleAuth() {
    setError(null);
    setMessage("Redirecting to Google.");
    setDebugDetails(null);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: nextPath,
      });

      if (result.error) {
        setDebugDetails(
          serializeDebugValue({
            googleEnabled,
            nextPath,
            error: result.error,
          }),
        );
        throw new Error(result.error.message || "Google sign-in could not start.");
      }
    } catch (authError) {
      setMessage(null);
      setDebugDetails(
        serializeDebugValue({
          googleEnabled,
          nextPath,
          error: authError,
        }),
      );
      setError(getErrorMessage(authError, "Google sign-in could not start."));
    }
  }

  const statusMessage = error
    ? { tone: "danger" as const, text: error }
    : message
      ? { tone: "info" as const, text: message }
      : null;

  return (
    <section className="w-full">
      <div className="mb-6 flex items-center justify-between lg:hidden">
        <WordMark />
      </div>

      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div>
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-foreground">
            {isSignup ? "Create your account" : "Sign in"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isSignup
              ? "Takes under a minute. You can upload a syllabus right after."
              : "Welcome back — enter your details to continue."}
          </p>
        </div>

        {googleEnabled ? (
          <div className="mt-6">
            <Button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isPending}
              variant="outline"
              className="w-full"
            >
              <GoogleGlyph />
              Continue with Google
            </Button>

            <div
              role="separator"
              className="mt-6 flex items-center gap-3 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              <span className="h-px flex-1 bg-border" />
              <span>or email</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        ) : null}

        <form action={handleEmailAuth} className="mt-6 space-y-4">
          {isSignup ? (
            <label className="block">
              <span className="text-sm font-medium text-foreground">Name</span>
              <Input
                type="text"
                name="name"
                autoComplete="name"
                className="mt-2"
                placeholder="Jane Doe"
                required
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-foreground">Email</span>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              className="mt-2"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Password</span>
            <Input
              type="password"
              name="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="mt-2"
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              required
            />
          </label>

          {statusMessage ? (
            <div
              aria-live="polite"
              className={
                statusMessage.tone === "danger"
                  ? "rounded-[var(--radius-lg)] border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
                  : "rounded-[var(--radius-lg)] border border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground"
              }
            >
              {statusMessage.text}
            </div>
          ) : null}

          {debugDetails ? (
            <details className="rounded-[var(--radius-lg)] border border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">
                Auth debug details
              </summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-foreground">
                {debugDetails}
              </pre>
            </details>
          ) : null}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending
              ? "Please wait…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>

        {!googleEnabled ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Google sign-in is hidden until <code>GOOGLE_CLIENT_ID</code> and{" "}
            <code>GOOGLE_CLIENT_SECRET</code> are configured.
          </p>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          href={`${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(nextPath)}`}
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </section>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M21.35 11.1h-9.17v2.9h5.27c-.23 1.42-1.66 4.16-5.27 4.16-3.17 0-5.76-2.63-5.76-5.86s2.59-5.86 5.76-5.86c1.8 0 3.01.77 3.7 1.43l2.53-2.43C16.8 3.86 14.77 3 12.18 3 7.43 3 3.58 6.85 3.58 11.6s3.85 8.6 8.6 8.6c4.96 0 8.25-3.49 8.25-8.41 0-.57-.06-.99-.08-1.29z"
        fill="currentColor"
      />
    </svg>
  );
}
