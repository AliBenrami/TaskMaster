import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { getButtonClassName } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireServerSession } from "@/lib/auth-session";
import { listUserClasses } from "@/lib/classes/queries";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function DashboardPage() {
  const session = await requireServerSession("/");
  const classes = await listUserClasses(session.user.id);
  const recentNotes = await db
    .select({
      id: note.id,
      title: note.title,
      classId: note.classId,
      updatedAt: note.updatedAt,
    })
    .from(note)
    .where(eq(note.userId, session.user.id))
    .orderBy(desc(note.updatedAt))
    .limit(3);
  const classNameById = new Map(
    classes.map((item) => [item.courseId, item.title]),
  );
  const firstName = (session.user.name ?? "").trim().split(" ")[0] ?? "";
  const greeting = firstName ? `Welcome back, ${firstName}` : "Welcome back";
  const noteCount = recentNotes.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={greeting}
        description={
          classes.length === 0 && noteCount === 0
            ? "Upload a syllabus to create your first class, then start taking notes against it."
            : "Jump back into your classes and recent notes, or kick off something new."
        }
        actions={
          <>
            <Link href="/notes?new=1" className={getButtonClassName("primary")}>
              New note
            </Link>
            <Link href="/parse-test" className={getButtonClassName("outline")}>
              Upload syllabus
            </Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Your notes</CardTitle>
            <CardDescription>{recentNotes.length} recent note{recentNotes.length === 1 ? "" : "s"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentNotes.length > 0 ? (
              recentNotes.map((item) => (
                <Link key={item.id} href="/notes" className="block rounded-[var(--radius-lg)] border border-border bg-surface-muted px-4 py-3 transition hover:border-border-strong hover:bg-surface">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.classId ? <Badge variant="accent">{classNameById.get(item.classId) ?? "Linked class"}</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Updated {formatTimestamp(item.updatedAt)}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your classes</CardTitle>
            <CardDescription>{classes.length} parsed class{classes.length === 1 ? "" : "es"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {classes.length > 0 ? (
              classes.slice(0, 3).map((item) => (
                <Link key={item.courseId} href={`/classes/${item.runId}`} className="block rounded-[var(--radius-lg)] border border-border bg-surface-muted px-4 py-3 transition hover:border-border-strong hover:bg-surface">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.courseCode ? <Badge variant="accent">{item.courseCode}</Badge> : null}
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.noteCount} linked note{item.noteCount === 1 ? "" : "s"}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No classes yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jump back in</CardTitle>
            <CardDescription>Fast links to the working parts of the product.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/classes" className={getButtonClassName("outline", "md", "w-full justify-center")}>
              Browse classes
            </Link>
            <Link href="/notes" className={getButtonClassName("outline", "md", "w-full justify-center")}>
              Open notes workspace
            </Link>
            <Link href="/parse-test" className={getButtonClassName("outline", "md", "w-full justify-center")}>
              Parse another syllabus
            </Link>
          </CardContent>
        </Card>
      </div>

      {classes.length === 0 && recentNotes.length === 0 ? (
        <EmptyState
          eyebrow="Start here"
          title="Build your first class workspace"
          description="Upload a syllabus first, then start taking notes inside the resulting class."
          action={
            <Link href="/parse-test" className={getButtonClassName("primary")}>
              Upload syllabus
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
