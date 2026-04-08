import type { ParseTestViewModel } from "@/lib/parse-test/contracts";
import { formatDueAt, formatPercent } from "../view-helpers";

export function AssignmentCard({ assignment }: { assignment: ParseTestViewModel["assignments"][number] }) {
  const primaryDate = formatDueAt(assignment.dueAt) ?? assignment.dateText;
  const secondaryDate =
    assignment.timeText && assignment.timeText !== assignment.dateText ? assignment.timeText : null;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white dark:bg-zinc-100 dark:text-zinc-950">
              {assignment.category}
            </span>
            {assignment.weightPercent != null ? (
              <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {formatPercent(assignment.weightPercent)} of grade
              </span>
            ) : null}
          </div>
          <h4 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{assignment.title}</h4>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">{assignment.sourceSnippet}</p>
        </div>

        <div className="min-w-40 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="font-medium text-zinc-900 dark:text-zinc-100">{primaryDate}</div>
          {secondaryDate ? <div className="mt-1 text-zinc-500 dark:text-zinc-400">{secondaryDate}</div> : null}
        </div>
      </div>
    </article>
  );
}
