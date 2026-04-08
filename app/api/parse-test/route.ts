import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MAX_PARSE_TEST_FILE_BYTES } from "@/lib/parse-test/contracts";
import { isParseTestEnabled } from "@/lib/parse-test/feature";
import { getParseTestErrorResponse, replaceParseTestWithUpload } from "@/lib/parse-test/service";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!isParseTestEnabled()) {
    return jsonError("ParseTest is disabled.", 404);
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return jsonError("Sign in before uploading a syllabus.", 401);
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return jsonError("Upload a PDF in the `file` field.", 400);
    }

    if (fileEntry.type !== "application/pdf") {
      return jsonError("Only PDF syllabi are supported in ParseTest.", 400);
    }

    if (fileEntry.size === 0) {
      return jsonError("The uploaded PDF is empty.", 400);
    }

    if (fileEntry.size > MAX_PARSE_TEST_FILE_BYTES) {
      return jsonError("The uploaded PDF exceeds the 20 MB ParseTest limit.", 400);
    }

    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
    const result = await replaceParseTestWithUpload({
      userId: session.user.id,
      fileBuffer,
      fileName: fileEntry.name,
      mimeType: fileEntry.type,
      fileSizeBytes: fileEntry.size,
    });

    return NextResponse.json({
      ok: true,
      isDuplicate: result.isDuplicate,
      preview: result.viewModel,
    });
  } catch (error) {
    const { message, status } = getParseTestErrorResponse(error);
    return jsonError(message, status);
  }
}
