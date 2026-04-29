import { and, inArray, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";
import { createNoteContent } from "@/lib/notes/markdown";
import { normalizeNoteDocument } from "@/lib/notes/records";
import type { QuizContextNote } from "@/lib/quizzes/gemini";

const MAX_MARKDOWN_CHARS_PER_NOTE = 18_000;

function normalizeEmbedding(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is number => typeof item === "number");
}

function getMarkdownFromContent(value: unknown) {
  const document = normalizeNoteDocument(value);
  const content = createNoteContent(document);
  return content.markdown.trim();
}

export async function getQuizContextNotes(params: {
  userId: string;
  noteIds: string[];
}): Promise<QuizContextNote[]> {
  const uniqueNoteIds = Array.from(new Set(params.noteIds)).slice(0, 12);
  if (uniqueNoteIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: note.id,
      title: note.title,
      content: note.content,
      embedding: note.embedding,
    })
    .from(note)
    .where(and(eq(note.userId, params.userId), inArray(note.id, uniqueNoteIds)));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    markdown: getMarkdownFromContent(row.content).slice(0, MAX_MARKDOWN_CHARS_PER_NOTE),
    embedding: normalizeEmbedding(row.embedding),
  }));
}
