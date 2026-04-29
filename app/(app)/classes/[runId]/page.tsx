import Link from "next/link";
import { desc, and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getButtonClassName } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireServerSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";
import { getParseTestViewModelForRun } from "@/lib/parse-test/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const tabs = ["overview", "contacts", "grading", "schedule", "notes"] as const;
type ClassTab = (typeof tabs)[number];
type ScheduleItem = {
  id: string;
  title: string;
  category: string;
  dateText: string;
  dueAt: string | null;
  timeText: string | null;
};
type UpcomingClassItem = ScheduleItem & {
  kind: "Assignment" | "Event";
};

function readTab(value: string | string[] | undefined): ClassTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return tabs.includes(tab as ClassTab) ? (tab as ClassTab) : "overview";
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getScheduleTime(value: ScheduleItem) {
  return new Date(value.dueAt ?? "9999-12-31T00:00:00.000Z").getTime();
}

function getUpcomingClassItems(
  assignments: ScheduleItem[],
  events: ScheduleItem[],
): UpcomingClassItem[] {
  const now = Date.now();
  const items: UpcomingClassItem[] = [
    ...assignments.map((assignment) => ({
      ...assignment,
      kind: "Assignment" as const,
    })),
    ...events.map((event) => ({
      ...event,
      kind: "Event" as const,
    })),
  ];

  const upcoming = items
    .filter((item) => !item.dueAt || getScheduleTime(item) >= now)
    .sort((left, right) => getScheduleTime(left) - getScheduleTime(right));

  return (upcoming.length > 0 ? upcoming : items.sort(
    (left, right) => getScheduleTime(right) - getScheduleTime(left),
  )).slice(0, 6);
}

export default async function ClassDetailPage(props: {
  params: Promise<{ runId: string }>;
  searchParams?: SearchParams;
}) {
  const session = await requireServerSession("/classes");
  const { runId } = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const currentTab = readTab(searchParams?.tab);
  const preview = await getParseTestViewModelForRun(session.user.id, runId);

  if (!preview) {
    notFound();
  }

  const classNotes = await db
    .select({
      id: note.id,
      title: note.title,
      sourceType: note.sourceType,
      fileName: note.fileName,
      updatedAt: note.updatedAt,
    })
    .from(note)
    .where(and(eq(note.userId, session.user.id), eq(note.classId, preview.course.id)))
    .orderBy(desc(note.updatedAt));
  const upcomingClassItems = getUpcomingClassItems(preview.assignments, preview.events);

  const tabLinkClass = (tab: ClassTab) =>
    currentTab === tab
      ? "bg-accent text-accent-foreground"
      : "bg-surface-muted text-muted-foreground hover:text-foreground";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Class detail"
        title={preview.course.title}
        description={preview.course.studentSummary}
        actions={
          <>
            <Link href={`/notes?classId=${preview.course.id}&new=1`} className={getButtonClassName("primary")}>
              New note in this class
            </Link>
            <Link href={`/notes?classId=${preview.course.id}`} className={getButtonClassName("outline")}>
              Manage notes
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {preview.course.courseCode ? <Badge variant="accent">{preview.course.courseCode}</Badge> : null}
        {preview.course.courseSection ? <Badge variant="outline">Section {preview.course.courseSection}</Badge> : null}
        {preview.course.term ? <Badge variant="outline">{preview.course.term}</Badge> : null}
        <Badge variant="outline">{classNotes.length} linked note{classNotes.length === 1 ? "" : "s"}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={`/classes/${runId}?tab=${tab}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${tabLinkClass(tab)}`}
          >
            {tab[0]?.toUpperCase()}
            {tab.slice(1)}
          </Link>
        ))}
      </div>

      {currentTab === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Class information</CardTitle>
              <CardDescription>Core course details extracted from the syllabus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Instructor:</span> {preview.course.instructorName ?? "Not extracted yet"}</p>
              <p><span className="font-medium text-foreground">Schedule:</span> {[preview.course.meetingDays, preview.course.meetingTime].filter(Boolean).join(" ") || "Not extracted yet"}</p>
              <p><span className="font-medium text-foreground">Location:</span> {preview.course.meetingLocation ?? "Not extracted yet"}</p>
              <p><span className="font-medium text-foreground">Updated:</span> {formatTimestamp(preview.run.updatedAt)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Materials and tools</CardTitle>
              <CardDescription>Resources pulled from the syllabus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Required materials</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {preview.course.requiredMaterials.length > 0 ? (
                    preview.course.requiredMaterials.map((material) => (
                      <Badge key={material} variant="outline">
                        {material}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">None extracted yet.</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">Homework tools</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {preview.course.homeworkTools.length > 0 ? (
                    preview.course.homeworkTools.map((tool) => (
                      <Badge key={tool} variant="accent">
                        {tool}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">None extracted yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming work</CardTitle>
              <CardDescription>Next deadlines and class events from this syllabus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingClassItems.length > 0 ? (
                upcomingClassItems.map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="rounded-[var(--radius-lg)] border border-border bg-surface-muted px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant={item.kind === "Assignment" ? "accent" : "outline"}>
                            {item.kind}
                          </Badge>
                          <Badge variant="outline">{item.category}</Badge>
                        </div>
                        <p className="line-clamp-2 text-sm font-medium text-foreground">
                          {item.title}
                        </p>
                        {item.timeText ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.timeText}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="neutral">
                        {formatDate(item.dueAt, item.dateText)}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No upcoming work parsed yet.
                </p>
              )}
              <Link
                href={`/classes/${runId}?tab=schedule`}
                className={getButtonClassName("outline", "sm", "w-full justify-center")}
              >
                View full schedule
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {currentTab === "contacts" ? (
        preview.contacts.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {preview.contacts.map((contact) => (
              <Card key={contact.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="accent">{contact.role}</Badge>
                  </div>
                  <CardTitle>{contact.name}</CardTitle>
                  <CardDescription>{contact.email ?? "Email not extracted"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">Office hours:</span> {contact.officeHours ?? "Not extracted yet"}</p>
                  <p><span className="font-medium text-foreground">Location:</span> {contact.location ?? "Not extracted yet"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No contacts parsed yet" description="Contact cards will appear here when the syllabus includes instructor or TA information." />
        )
      ) : null}

      {currentTab === "grading" ? (
        preview.gradingItems.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {preview.gradingItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.label}</CardTitle>
                  <CardDescription>{item.weightPercent}% of final grade</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-2 rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${item.weightPercent}%` }} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No grading items parsed yet" description="Once grading criteria are extracted from the syllabus, they will show up here." />
        )
      ) : null}

      {currentTab === "schedule" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Deadlines and graded work parsed from the syllabus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {preview.assignments.length > 0 ? (
                preview.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-[var(--radius-lg)] border border-border bg-surface-muted px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground">{assignment.category}</p>
                      </div>
                      <Badge variant="outline">{formatDate(assignment.dueAt, assignment.dateText)}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No assignments parsed yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calendar events</CardTitle>
              <CardDescription>Read-only events the calendar scaffold can already surface.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {preview.events.length > 0 ? (
                preview.events.map((event) => (
                  <div key={event.id} className="rounded-[var(--radius-lg)] border border-border bg-surface-muted px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.category}</p>
                      </div>
                      <Badge variant="outline">{formatDate(event.dueAt, event.dateText)}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No events parsed yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {currentTab === "notes" ? (
        classNotes.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {classNotes.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.sourceType === "upload" ? "Imported file" : "Manual note"}</Badge>
                    {item.fileName ? <Badge variant="accent">{item.fileName}</Badge> : null}
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>Updated {formatTimestamp(item.updatedAt.toISOString())}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/notes?classId=${preview.course.id}`} className={getButtonClassName("outline", "md", "w-full justify-center")}>
                    Open in notes workspace
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            eyebrow="Notes"
            title="No notes linked yet"
            description="Create a note directly from this class or open the notes workspace to file existing notes under this class."
            action={
              <div className="flex flex-wrap gap-3">
                <Link href={`/notes?classId=${preview.course.id}&new=1`} className={getButtonClassName("primary")}>
                  New note in this class
                </Link>
                <Link href={`/notes?classId=${preview.course.id}`} className={getButtonClassName("outline")}>
                  Link existing notes
                </Link>
              </div>
            }
          />
        )
      ) : null}
    </div>
  );
}
