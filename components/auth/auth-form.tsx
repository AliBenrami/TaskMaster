"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";

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

  return (
    <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          TaskMaster
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
          {isSignup ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          {isSignup
            ? "Create an account to save syllabus parses under your own workspace."
            : "Sign in to access your saved ParseTest syllabus workspace."}
        </p>
      </div>

      <form action={handleEmailAuth} className="mt-6 space-y-4">
        {isSignup ? (
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Name</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none ring-0 transition focus:border-zinc-500"
              placeholder="Jane Doe"
              required
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none ring-0 transition focus:border-zinc-500"
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Password</span>
          <input
            type="password"
            name="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none ring-0 transition focus:border-zinc-500"
            placeholder={isSignup ? "Create a password" : "Enter your password"}
            required
          />
        </label>

        <div
          aria-live="polite"
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600"
        >
          {error ? <span className="text-rose-600">{error}</span> : message ?? "Use email/password or Google."}
        </div>

        {debugDetails ? (
          <details className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            <summary className="cursor-pointer font-medium text-zinc-800">
              Auth debug details
            </summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-zinc-700">
              {debugDetails}
            </pre>
          </details>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      {googleEnabled ? (
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isPending}
          className="mt-3 w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue with Google
        </button>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500">
          Google sign-in is hidden until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured.
        </div>
      )}

      <p className="mt-6 text-sm text-zinc-600">
        {isSignup ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          href={`${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(nextPath)}`}
          className="font-medium text-zinc-950 underline underline-offset-4"
        >
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </section>
  );
}
