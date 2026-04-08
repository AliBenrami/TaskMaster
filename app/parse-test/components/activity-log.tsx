type ActivityLogProps = {
  logs: string[];
  isBusy: boolean;
};

export function ActivityLog({ logs, isBusy }: ActivityLogProps) {
  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
          Live activity
        </div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
          {isBusy ? "Running" : "Complete"}
        </div>
      </div>
      <ol className="mt-3 space-y-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
        {logs.map((log, index) => {
          const isLatest = index === logs.length - 1;

          return (
            <li
              key={`${index}-${log}`}
              className={`flex gap-3 rounded-xl px-3 py-2 ${
                isLatest ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100" : ""
              }`}
            >
              <span className="min-w-5 text-zinc-400 dark:text-zinc-500">{index + 1}.</span>
              <span>{log}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
