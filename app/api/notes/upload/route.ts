import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";
import { assertClassBelongsToUser } from "@/lib/classes/queries";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// POST /api/notes/upload — create a note from an uploaded file
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field in form data" },
      { status: 400 },
    );
  }

  // Validate mime type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type}. Accepted: ${[...ALLOWED_MIME_TYPES].join(", ")}`,
      },
      { status: 415 },
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
      },
      { status: 413 },
    );
  }

  // Convert to base64 data URL and store in DB
  //
  // NOTE: For production, swap this for an upload to Vercel Blob / S3 / R2
  // and store the returned URL in fileUrl instead.
  let fileUrl: string;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    fileUrl = `data:${file.type};base64,${base64}`;
  } catch {
    return NextResponse.json(
      { error: "Failed to process uploaded file" },
      { status: 500 },
    );
  }

  const rawTitle = formData.get("title");
  const title =
    typeof rawTitle === "string" && rawTitle.trim()
      ? rawTitle.trim()
      : file.name.replace(/\.[^.]+$/, "") || "Uploaded Note";
  const rawClassId = formData.get("classId");
  const classId =
    typeof rawClassId === "string" && rawClassId.trim() ? rawClassId.trim() : null;

  if (classId) {
    const ownedClass = await assertClassBelongsToUser(classId, session.user.id);
    if (!ownedClass) {
      return NextResponse.json({ error: "Invalid class selection" }, { status: 400 });
    }
  }

  const [created] = await db
    .insert(note)
    .values({
      userId: session.user.id,
      title,
      classId,
      sourceType: "upload",
      fileUrl,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      content: null, // future OCR/parse step can populate this
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}