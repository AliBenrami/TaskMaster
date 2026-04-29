import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { vectorService } from "@/lib/vector";

export const runtime = "nodejs";

const requestSchema = z.object({
  queryText: z.string().trim().min(1, "queryText is required"),
  sourceType: z.string().trim().min(1).optional(),
  sourceId: z.string().trim().min(1).optional(),
  topK: z.number().int().min(1).max(50).optional(),
  minScore: z.number().min(-1).max(1).optional(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Expected JSON body" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { queryText, sourceType, sourceId, topK, minScore } = parsed.data;

  try {
    const hits = await vectorService.query({
      userId: session.user.id,
      queryText,
      sourceType,
      sourceId,
      topK: topK ?? 8,
      minScore,
    });

    return NextResponse.json({
      query: { queryText, sourceType, sourceId, topK: topK ?? 8, minScore },
      count: hits.length,
      hits: hits.map((hit) => ({
        id: hit.id,
        sourceType: hit.sourceType,
        sourceId: hit.sourceId,
        chunkIndex: hit.chunkIndex,
        content: hit.content,
        metadata: hit.metadata,
        score: hit.score,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to query the vector service.",
      },
      { status: 500 },
    );
  }
}
