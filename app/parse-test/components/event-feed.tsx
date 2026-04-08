import type { ParseTestViewModel } from "@/lib/parse-test/contracts";

type EventFeedProps = {
  events: ParseTestViewModel["events"];
  savedAt: string | null;
  exportMessage: string | null;
  onExport: () => void;
  formatDisplayDate: (dueAt: string | null, dateText: string) => string;
  formatSavedAt: (value: string | null) => string | null;
};

export function EventFeed({
  events,
  savedAt,
  exportMessage,
  onExport,
  formatDisplayDate,
  formatSavedAt,
}: EventFeedProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Extracted dates
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Saved event feed
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Every explicit calendar-dated item saved from your current ParseTest parse.
          </p>
        </div>

        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
        >
          Export UTF-8 JSON
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
        <span>{events.length} saved event{events.length === 1 ? "" : "s"}</span>
        {savedAt ? <span>Updated {formatSavedAt(savedAt)}</span> : null}
      </div>

      {exportMessage ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          {exportMessage}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {events.length > 0 ? (
          events.map((event) => (
            <article
              key={event.id}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                      {event.category}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    {event.title}
                  </div>
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {event.sourceSnippet}
                  </p>
                </div>

                <div className="min-w-40 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatDisplayDate(event.dueAt, event.dateText)}
                  </div>
                  {event.timeText ? (
                    <div className="mt-1 text-zinc-500 dark:text-zinc-400">{event.timeText}</div>
                  ) : null}
                  {event.location ? (
                    <div className="mt-1 text-zinc-500 dark:text-zinc-400">{event.location}</div>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-sm leading-6 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No saved event feed yet. Upload a syllabus with explicit calendar dates to populate this
            list and enable export.
          </div>
        )}
      </div>
    </section>
  );
}
