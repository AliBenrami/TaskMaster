import { connection } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";
import { requireServerSession } from "@/lib/auth-session";
import { noteRecordToWorkspaceNote, sortWorkspaceNotes } from "@/lib/notes/records";
import { NotesWorkspace } from "./notes-workspace";

export default async function NotesPage() {
  await connection();

  const session = await requireServerSession("/notes");
  const rows = await db
    .select({
      id: note.id,
      title: note.title,
      content: note.content,
      sourceType: note.sourceType,
      fileName: note.fileName,
      mimeType: note.mimeType,
      fileSize: note.fileSize,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })
    .from(note)
    .where(eq(note.userId, session.user.id))
    .orderBy(desc(note.updatedAt));

  const initialNotes = sortWorkspaceNotes(rows.map((row) => noteRecordToWorkspaceNote(row)));

  return (
    <NotesWorkspace
      displayName={session.user.name || session.user.email}
      initialNotes={initialNotes}
    />
  );
}

