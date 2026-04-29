import { connection } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";
import { requireServerSession } from "@/lib/auth-session";
import { QuizzesClient } from "@/app/quizzes/quizzes-client";

export default async function QuizzesPage() {
  await connection();

  const session = await requireServerSession("/quizzes");
  const rows = await db
    .select({
      id: note.id,
      title: note.title,
      embedding: note.embedding,
      updatedAt: note.updatedAt,
    })
    .from(note)
    .where(eq(note.userId, session.user.id))
    .orderBy(desc(note.updatedAt));

  return (
    <QuizzesClient
      notes={rows.map((row) => ({
        id: row.id,
        title: row.title,
        updatedAt: row.updatedAt.toISOString(),
        hasEmbedding: Array.isArray(row.embedding) && row.embedding.length > 0,
      }))}
    />
  );
}
