"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);

    try {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
