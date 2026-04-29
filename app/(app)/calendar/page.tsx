import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireServerSession } from "@/lib/auth-session";
import { listUserClassEvents } from "@/lib/classes/queries";

function formatDate(value: Date | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function CalendarPage() {
  const session = await requireServerSession("/calendar");
  const events = await listUserClassEvents(session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendar"
        title="Calendar"
        description="The calendar scaffold already surfaces parsed syllabus events on the left, with the full planning interface reserved for later work."
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming class events</CardTitle>
            <CardDescription>Read-only items pulled from parsed syllabi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length > 0 ? (
              events.map((event) => (
                <div key={event.id} className="rounded-[var(--radius-lg)] border border-border bg-surface-muted px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="accent">{event.courseTitle}</Badge>
                    <Badge variant="outline">{event.category}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">{event.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(event.dueAt, event.dateText)}
                    {event.timeText ? ` · ${event.timeText}` : ""}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No parsed events yet.</p>
            )}
          </CardContent>
        </Card>

        <EmptyState
          eyebrow="Calendar grid"
          title="Interactive scheduling is scaffolded"
          description="The full calendar UI, drag-and-drop editing, and auto-scheduling are intentionally not implemented yet."
        />
      </div>
    </div>
  );
}
