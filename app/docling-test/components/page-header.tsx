import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { DoclingDocumentMode } from "@/lib/docling-test/contracts";
import { getDoclingModeRouteTitle } from "@/lib/docling-test/mode";

export function PageHeader({
  displayName,
  mode,
}: {
  displayName: string;
  mode: DoclingDocumentMode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
          TaskMaster
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">DoclingTest</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{getDoclingModeRouteTitle(mode)}</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Signed in as {displayName}</p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
        >
          Back home
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}
