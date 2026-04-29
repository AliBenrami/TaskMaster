import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { flashcards } from "@/lib/db/schema";
import { getFlashcardContextNotes } from "@/lib/flashcards/context";
import { generateFlashcardDeck } from "@/lib/flashcards/gemini";
import type { FlashcardDeck, FlashcardItem } from "@/lib/flashcards/types";

export const runtime = "nodejs";

const createFlashcardsSchema = z.object({
  noteIds: z.array(z.string().min(1)).min(1).max(12),
  cardCount: z.number().int().min(4).max(40),
});

function normalizeCards(value: unknown): FlashcardItem[] {
  const parsed = z
    .array(
      z.object({
        id: z.string().min(1),
        front: z.string().min(1),
        back: z.string().min(1),
        sourceNoteTitles: z.array(z.string().min(1)).min(1),
      }),
    )
    .safeParse(value);

  return parsed.success ? parsed.data : [];
}

function rowToDeck(row: {
  id: string;
  title: string;
  sourceNoteIds: string[];
  cards: unknown;
  cardCount: number;
  createdAt: Date;
  updatedAt: Date;
}): FlashcardDeck {
  return {
    id: row.id,
    title: row.title,
    sourceNoteIds: row.sourceNoteIds,
    cards: normalizeCards(row.cards),
    cardCount: row.cardCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: flashcards.id,
      title: flashcards.title,
      sourceNoteIds: flashcards.sourceNoteIds,
      cards: flashcards.cards,
      cardCount: flashcards.cardCount,
      createdAt: flashcards.createdAt,
      updatedAt: flashcards.updatedAt,
    })
    .from(flashcards)
    .where(eq(flashcards.userId, session.user.id))
    .orderBy(desc(flashcards.createdAt));

  return NextResponse.json({ decks: rows.map(rowToDeck) });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createFlashcardsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid flashcard generation options" }, { status: 400 });
  }

  const uniqueNoteIds = Array.from(new Set(parsed.data.noteIds));
  const contextNotes = await getFlashcardContextNotes({
    userId: session.user.id,
    noteIds: uniqueNoteIds,
  });

  if (contextNotes.length !== uniqueNoteIds.length) {
    return NextResponse.json({ error: "One or more selected notes could not be found" }, { status: 404 });
  }

  if (contextNotes.every((note) => note.embedding.length === 0)) {
    return NextResponse.json(
      { error: "Selected notes do not have stored embeddings yet" },
      { status: 400 },
    );
  }

  try {
    const generatedDeck = await generateFlashcardDeck({
      notes: contextNotes,
      cardCount: parsed.data.cardCount,
    });

    const [created] = await db
      .insert(flashcards)
      .values({
        userId: session.user.id,
        title: generatedDeck.title,
        sourceNoteIds: uniqueNoteIds,
        cards: generatedDeck.cards,
        cardCount: generatedDeck.cards.length,
      })
      .returning();

    return NextResponse.json({ deck: rowToDeck(created) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Flashcard generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
