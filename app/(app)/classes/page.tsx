import Link from "next/link";
import { getButtonClassName } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireServerSession } from "@/lib/auth-session";
import { listUserClasses } from "@/lib/classes/queries";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ClassesPage() {
  const session = await requireServerSession("/classes");
  const classes = await listUserClasses(session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Classes"
        title="Your parsed classes"
        description="Every syllabus upload becomes a real class page that can hold notes, contacts, grading, and schedule context."
        actions={
          <Link href="/parse-test" className={getButtonClassName("primary")}>
            Upload syllabus
          </Link>
        }
      />

      {classes.length === 0 ? (
        <EmptyState
          eyebrow="No classes yet"
          title="Upload your first syllabus"
          description="Once a syllabus is parsed, it will show up here as a real class card and immediately become available inside the notes workspace."
          action={
            <Link href="/parse-test" className={getButtonClassName("primary")}>
              Open syllabus upload
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {classes.map((item) => (
            <Link key={item.courseId} href={`/classes/${item.runId}`}>
              <Card className="h-full transition hover:border-border-strong hover:bg-surface-muted">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.courseCode ? <Badge variant="accent">{item.courseCode}</Badge> : null}
                    {item.courseSection ? <Badge variant="outline">Section {item.courseSection}</Badge> : null}
                    <Badge variant="outline">{item.noteCount} note{item.noteCount === 1 ? "" : "s"}</Badge>
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>
                    {item.instructorName ? `${item.instructorName} · ` : ""}
                    {item.meetingDays || item.meetingTime
                      ? `${item.meetingDays ?? "Schedule TBD"} ${item.meetingTime ?? ""}`.trim()
                      : "Schedule pending from syllabus"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {item.meetingLocation ?? "Location not extracted yet"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {formatTimestamp(item.updatedAt)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
