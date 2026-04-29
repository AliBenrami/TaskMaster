"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getButtonClassName } from "@/components/ui/button";
import { cx } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  category: string;
  dateText: string;
  dueAt: string | null;
  timeText: string | null;
  location: string | null;
};

type CalendarClientProps = {
  events: CalendarEvent[];
  initialDate: string;
};

type CalendarDay = {
  date: Date;
  key: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEventDateKey(event: CalendarEvent) {
  if (!event.dueAt) {
    return null;
  }

  const date = new Date(event.dueAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(date: Date) {
  return MONTH_LABEL_FORMATTER.format(date);
}

function formatLongDate(date: Date) {
  return LONG_DATE_FORMATTER.format(date);
}

function formatEventDate(event: CalendarEvent) {
  if (!event.dueAt) {
    return event.dateText;
  }

  return EVENT_DATE_FORMATTER.format(new Date(event.dueAt));
}

function buildCalendarDays(monthDate: Date, todayKey: string) {
  const monthStart = startOfMonth(monthDate);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index): CalendarDay => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = getLocalDateKey(date);

    return {
      date,
      key,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: key === todayKey,
    };
  });
}

function getUpcomingEvents(events: CalendarEvent[], todayKey: string) {
  return events
    .filter((event) => {
      const eventKey = getEventDateKey(event);
      return !eventKey || eventKey >= todayKey;
    })
    .sort((first, second) => {
      const firstKey = getEventDateKey(first) ?? "9999-12-31";
      const secondKey = getEventDateKey(second) ?? "9999-12-31";
      return firstKey.localeCompare(secondKey);
    })
    .slice(0, 8);
}

function EventRow({ event }: { event: CalendarEvent }) {
  return (
    <article className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent">{event.courseTitle}</Badge>
        <Badge variant="outline">{event.category}</Badge>
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-5 text-foreground">
        {event.title}
      </h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {formatEventDate(event)}
        {event.timeText ? ` / ${event.timeText}` : ""}
        {event.location ? ` / ${event.location}` : ""}
      </p>
    </article>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("h-4 w-4", direction === "left" && "rotate-180")}
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function CalendarClient({ events, initialDate }: CalendarClientProps) {
  const today = useMemo(() => new Date(initialDate), [initialDate]);
  const todayKey = useMemo(() => getLocalDateKey(today), [today]);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today));
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const days = useMemo(
    () => buildCalendarDays(visibleMonth, todayKey),
    [todayKey, visibleMonth],
  );
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = getEventDateKey(event);
      if (!key) {
        continue;
      }
      const dateEvents = grouped.get(key);
      if (dateEvents) {
        dateEvents.push(event);
      } else {
        grouped.set(key, [event]);
      }
    }
    return grouped;
  }, [events]);
  const selectedDay = days.find((day) => day.key === selectedKey);
  const selectedDate = selectedDay?.date ?? today;
  const selectedEvents = eventsByDate.get(selectedKey) ?? [];
  const upcomingEvents = useMemo(
    () => getUpcomingEvents(events, todayKey),
    [events, todayKey],
  );
  const eventsThisMonth = days.reduce(
    (count, day) =>
      count + (day.isCurrentMonth ? (eventsByDate.get(day.key)?.length ?? 0) : 0),
    0,
  );

  function moveVisibleMonth(amount: number) {
    const next = addMonths(visibleMonth, amount);
    setVisibleMonth(next);
    setSelectedKey(getLocalDateKey(next));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-card)]">
        <div className="min-w-[720px]">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Month view
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {formatMonthLabel(visibleMonth)}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => moveVisibleMonth(-1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                aria-label="Previous month"
              >
                <Chevron direction="left" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = startOfMonth(new Date());
                  setVisibleMonth(current);
                  setSelectedKey(getLocalDateKey(new Date()));
                }}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface-muted px-3 text-sm font-medium text-foreground transition hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => moveVisibleMonth(1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                aria-label="Next month"
              >
                <Chevron direction="right" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border bg-surface-muted/55">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="px-2 py-3 text-center text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayEvents = eventsByDate.get(day.key) ?? [];
              const selected = selectedKey === day.key;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedKey(day.key)}
                  className={cx(
                    "min-h-[7.4rem] border-b border-border p-2 text-left transition focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                    index % 7 !== 6 && "border-r",
                    !day.isCurrentMonth && "bg-surface-muted/35 text-muted-foreground",
                    selected && "bg-accent-soft",
                  )}
                  aria-pressed={selected}
                  aria-label={`${formatLongDate(day.date)}, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cx(
                        "inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium",
                        day.isToday && "bg-foreground text-background",
                        selected &&
                          !day.isToday &&
                          "bg-surface text-accent shadow-[inset_0_0_0_1px_var(--border)]",
                      )}
                    >
                      {day.dayNumber}
                    </span>
                    {dayEvents.length > 0 ? (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[0.68rem] font-semibold text-accent shadow-[inset_0_0_0_1px_var(--border)]">
                        {dayEvents.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="truncate rounded-md bg-surface px-2 py-1 text-[0.72rem] font-medium text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 ? (
                      <div className="px-2 text-[0.7rem] font-medium text-muted-foreground">
                        +{dayEvents.length - 2} more
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm text-muted-foreground">
            <span>
              {eventsThisMonth} event{eventsThisMonth === 1 ? "" : "s"} this month
            </span>
            <span>
              {events.length} total parsed event{events.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Selected day
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {formatLongDate(selectedDate)}
          </h2>

          <div className="mt-4 space-y-3">
            {selectedEvents.length > 0 ? (
              selectedEvents.map((event) => <EventRow key={event.id} event={event} />)
            ) : (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface-muted px-4 py-6 text-sm leading-6 text-muted-foreground">
                No parsed syllabus events are scheduled for this date.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Upcoming
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Agenda
              </h2>
            </div>
            {events.length === 0 ? (
              <Link href="/parse-test" className={getButtonClassName("outline", "sm")}>
                Upload
              </Link>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => <EventRow key={event.id} event={event} />)
            ) : (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface-muted px-4 py-6">
                <p className="text-sm font-medium text-foreground">
                  No upcoming parsed events yet.
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Upload a syllabus to populate this calendar with class dates.
                </p>
              </div>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
