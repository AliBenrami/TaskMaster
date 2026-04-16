import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MAX_DOCLING_TEST_FILE_BYTES } from "@/lib/docling-test/contracts";
import { isDoclingTestEnabled } from "@/lib/docling-test/feature";
import { parseDoclingDocumentMode } from "@/lib/docling-test/mode";
import { deleteDoclingTestRun, getDoclingTestErrorResponse } from "@/lib/docling-test/service";
import { createDoclingTestUploadStream, jsonError } from "./streaming";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isDoclingTestEnabled()) {
    return jsonError("docling-test is disabled.", 404);
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return jsonError("Sign in before uploading a document.", 401);
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const mode = parseDoclingDocumentMode(
      typeof formData.get("mode") === "string" ? String(formData.get("mode")) : undefined,
    );

    if (!(fileEntry instanceof File)) {
      return jsonError("Upload a document in the `file` field.", 400);
    }

    if (fileEntry.size === 0) {
      return jsonError("The uploaded document is empty.", 400);
    }

    if (fileEntry.size > MAX_DOCLING_TEST_FILE_BYTES) {
      return jsonError("The uploaded document exceeds the 20 MB docling-test limit.", 400);
    }

    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
    const stream = createDoclingTestUploadStream({
      userId: session.user.id,
      fileBuffer,
      fileName: fileEntry.name,
      mimeType: fileEntry.type,
      fileSizeBytes: fileEntry.size,
      mode,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    const { message, status, details } = getDoclingTestErrorResponse(error);
    return jsonError(message, status, Array.isArray(details?.logs) ? (details.logs as string[]) : []);
  }
}

export async function DELETE(request: Request) {
  if (!isDoclingTestEnabled()) {
    return jsonError("docling-test is disabled.", 404);
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return jsonError("Sign in before deleting a saved run.", 401);
    }

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return jsonError("Provide a runId to delete.", 400);
    }

    const result = await deleteDoclingTestRun({
      userId: session.user.id,
      runId,
    });

    return NextResponse.json({
      ok: true,
      nextRunId: result.nextRunId,
    });
  } catch (error) {
    const { message, status, details } = getDoclingTestErrorResponse(error);
    return jsonError(message, status, Array.isArray(details?.logs) ? (details.logs as string[]) : []);
  }
}
