"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DoclingDocumentMode } from "@/lib/docling-test/contracts";

type DoclingTestRunSwitcherProps = {
  mode: DoclingDocumentMode;
  currentRunId: string;
  currentIndex: number;
  totalCount: number;
  prevRunId: string | null;
  nextRunId: string | null;
};

export function DoclingTestRunSwitcher({
  mode,
  currentRunId,
  currentIndex,
  totalCount,
  prevRunId,
  nextRunId,
}: DoclingTestRunSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  function goToRun(runId: string | null) {
    if (!runId) {
      return;
    }

    startTransition(() => {
      router.replace(`/docling-test?mode=${encodeURIComponent(mode)}&run=${encodeURIComponent(runId)}`);
      router.refresh();
    });
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/docling-test?runId=${encodeURIComponent(currentRunId)}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; nextRunId?: string | null }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Could not delete the saved docling-test run.");
      }

      startTransition(() => {
        const nextUrl = payload?.nextRunId
          ? `/docling-test?mode=${encodeURIComponent(mode)}&run=${encodeURIComponent(payload.nextRunId)}&upload=deleted`
          : `/docling-test?mode=${encodeURIComponent(mode)}&upload=deleted`;
        router.replace(nextUrl);
        router.refresh();
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete the saved docling-test run.";
      window.alert(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const isBusy = isPending || isDeleting;

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {currentIndex + 1}/{totalCount}
      </span>
      <button
        type="button"
        onClick={() => goToRun(prevRunId)}
        disabled={!prevRunId || isBusy}
        className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
      >
        Prev
      </button>
      <button
        type="button"
        onClick={() => goToRun(nextRunId)}
        disabled={!nextRunId || isBusy}
        className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
      >
        Next
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isBusy}
        className="rounded-full border border-rose-300 px-3 py-1.5 text-sm text-rose-700 transition hover:border-rose-400 hover:text-rose-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:text-rose-100"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
