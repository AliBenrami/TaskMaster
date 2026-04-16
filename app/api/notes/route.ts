import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";

// GET /api/notes — list the authenticated user's notes
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notes = await db
    .select({
      id: note.id,
      userId: note.userId,
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

  return NextResponse.json(notes);
}

// POST /api/notes — create a manual text note
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: string; content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "Untitled";

  // content is the Editor.js output JSON — we store it as-is
  const content = body.content ?? null;

  const [created] = await db
    .insert(note)
    .values({
      userId: session.user.id,
      title,
      content,
      sourceType: "manual",
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
