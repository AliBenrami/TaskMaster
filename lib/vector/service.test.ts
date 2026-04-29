import { describe, expect, it, vi } from "vitest";
import { embedding } from "@/lib/db/schema";
import { markdownChunker } from "@/lib/vector/chunker";
import { createVectorService } from "@/lib/vector/service";
import type { Embedder, EmbeddingTaskType } from "@/lib/vector/types";

type EmbeddingRow = typeof embedding.$inferSelect;

const DIMENSIONS = 768;

function createFakeEmbedder(): Embedder & {
  calls: Array<{ texts: string[]; taskType: EmbeddingTaskType }>;
} {
  const calls: Array<{ texts: string[]; taskType: EmbeddingTaskType }> = [];
  return {
    model: "fake-embedder",
    dimensions: DIMENSIONS,
    calls,
    async embed(texts: string[], taskType: EmbeddingTaskType) {
      calls.push({ texts, taskType });
      return texts.map(() => Array(DIMENSIONS).fill(0.001));
    },
  };
}

type FakeDbOptions = {
  selectResults?: unknown[][];
  orderedSelectResult?: unknown[];
  deleteResult?: Array<{ id: string }>;
};

function createFakeDb(options: FakeDbOptions = {}) {
  const selectQueue = [...(options.selectResults ?? [])];
  const orderedSelectResult = options.orderedSelectResult ?? [];
  const deleteResult = options.deleteResult ?? [];

  const captured = {
    inserted: [] as Array<typeof embedding.$inferInsert>,
    insertedRows: [] as EmbeddingRow[],
    selectCalls: [] as Array<{ fields: Record<string, unknown> | undefined }>,
    deleteCalled: false,
  };

  const db = {
    select(fields?: Record<string, unknown>) {
      captured.selectCalls.push({ fields });
      return {
        from() {
          return {
            where() {
              const next = selectQueue.shift() ?? [];
              const promise: Promise<unknown[]> = Promise.resolve(next);
              return Object.assign(promise, {
                orderBy() {
                  return {
                    limit() {
                      return Promise.resolve(orderedSelectResult);
                    },
                  };
                },
              });
            },
          };
        },
      };
    },
    insert() {
      return {
        values(rows: Array<typeof embedding.$inferInsert>) {
          captured.inserted.push(...rows);
          return {
            returning() {
              const insertedRows: EmbeddingRow[] = rows.map((row, index) => ({
                id: `id-${captured.insertedRows.length + index}`,
                userId: row.userId,
                sourceType: row.sourceType,
                sourceId: row.sourceId,
                chunkIndex: row.chunkIndex ?? 0,
                content: row.content,
                contentHash: row.contentHash,
                metadata: (row.metadata ?? {}) as Record<string, unknown>,
                embedding: row.embedding,
                model: row.model,
                createdAt: new Date(),
                updatedAt: new Date(),
              }));
              captured.insertedRows.push(...insertedRows);
              return Promise.resolve(insertedRows);
            },
          };
        },
      };
    },
    delete() {
      captured.deleteCalled = true;
      return {
        where() {
          return {
            returning() {
              return Promise.resolve(deleteResult);
            },
          };
        },
      };
    },
  };

  return { db, captured };
}

describe("createVectorService.ingest", () => {
  it("bypasses the chunker when chunks are supplied", async () => {
    const embedder = createFakeEmbedder();
    const chunker = { chunk: vi.fn(() => []) };
    const { db, captured } = createFakeDb({ selectResults: [[]] });
    const service = createVectorService({ db, embedder, chunker });

    const result = await service.ingest({
      userId: "u1",
      sourceType: "note",
      sourceId: "n1",
      chunks: [
        { content: "first chunk" },
        { content: "second chunk", metadata: { tag: "x" } },
      ],
    });

    expect(chunker.chunk).not.toHaveBeenCalled();
    expect(captured.inserted).toHaveLength(2);
    expect(captured.inserted[0]).toMatchObject({
      userId: "u1",
      sourceType: "note",
      sourceId: "n1",
      content: "first chunk",
      chunkIndex: 0,
      model: "fake-embedder",
    });
    expect(captured.inserted[1].metadata).toEqual({ tag: "x" });
    expect(result.inserted).toHaveLength(2);
    expect(result.skipped).toEqual([]);
  });

  it("uses the chunker when raw text is supplied", async () => {
    const embedder = createFakeEmbedder();
    const chunker = markdownChunker({ maxChars: 50, overlap: 0, minChars: 1 });
    const { db, captured } = createFakeDb({ selectResults: [[]] });
    const service = createVectorService({ db, embedder, chunker });

    await service.ingest({
      userId: "u1",
      sourceType: "doc",
      sourceId: "d1",
      text: "# Heading\n\nFirst paragraph.\n\n## Sub\n\nSecond paragraph.",
      metadata: { source: "test" },
    });

    expect(captured.inserted.length).toBeGreaterThanOrEqual(1);
    for (const row of captured.inserted) {
      expect(row.metadata).toMatchObject({ source: "test" });
    }
  });

  it("skips chunks whose contentHash already exists", async () => {
    const embedder = createFakeEmbedder();
    const { createHash } = await import("node:crypto");
    const duplicateContent = "already there";
    const duplicateHash = createHash("sha256")
      .update(duplicateContent, "utf8")
      .digest("hex");

    const { db, captured } = createFakeDb({
      selectResults: [[{ contentHash: duplicateHash }]],
    });
    const service = createVectorService({ db, embedder });

    const result = await service.ingest({
      userId: "u1",
      sourceType: "note",
      sourceId: "n1",
      chunks: [
        { content: duplicateContent },
        { content: "fresh content" },
      ],
    });

    expect(result.skipped).toEqual([
      { contentHash: duplicateHash, reason: "duplicate" },
    ]);
    expect(captured.inserted).toHaveLength(1);
    expect(captured.inserted[0].content).toBe("fresh content");
    expect(embedder.calls).toHaveLength(1);
    expect(embedder.calls[0].texts).toEqual(["fresh content"]);
  });

  it("uses precomputed embeddings without invoking the embedder", async () => {
    const embedder = createFakeEmbedder();
    const precomputed = Array(DIMENSIONS).fill(0.5);
    const { db, captured } = createFakeDb({ selectResults: [[]] });
    const service = createVectorService({ db, embedder });

    await service.ingest({
      userId: "u1",
      sourceType: "note",
      sourceId: "n1",
      chunks: [{ content: "ready", embedding: precomputed }],
    });

    expect(embedder.calls).toHaveLength(0);
    expect(captured.inserted[0].embedding).toEqual(precomputed);
  });
});

describe("createVectorService.query", () => {
  it("embeds queryText and returns hits with score = 1 - distance", async () => {
    const embedder = createFakeEmbedder();
    const { db, captured } = createFakeDb({
      orderedSelectResult: [
        {
          id: "e1",
          sourceType: "note",
          sourceId: "n1",
          chunkIndex: 0,
          content: "alpha",
          metadata: { tag: "x" },
          score: 0.92,
        },
        {
          id: "e2",
          sourceType: "note",
          sourceId: "n2",
          chunkIndex: 1,
          content: "beta",
          metadata: {},
          score: "0.41",
        },
      ],
    });

    const service = createVectorService({ db, embedder });

    const hits = await service.query({
      userId: "u1",
      sourceType: "note",
      queryText: "alpha?",
      topK: 5,
      minScore: 0.5,
    });

    expect(captured.selectCalls.length).toBeGreaterThan(0);
    expect(embedder.calls[0].taskType).toBe("RETRIEVAL_QUERY");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      id: "e1",
      sourceId: "n1",
      score: 0.92,
    });
  });

  it("skips embedder when queryVector is provided", async () => {
    const embedder = createFakeEmbedder();
    const { db } = createFakeDb({ orderedSelectResult: [] });
    const service = createVectorService({ db, embedder });

    await service.query({
      userId: "u1",
      queryVector: Array(DIMENSIONS).fill(0.1),
      topK: 3,
    });

    expect(embedder.calls).toHaveLength(0);
  });

  it("rejects queryVector with wrong dimensionality", async () => {
    const embedder = createFakeEmbedder();
    const { db } = createFakeDb({ orderedSelectResult: [] });
    const service = createVectorService({ db, embedder });

    await expect(
      service.query({
        userId: "u1",
        queryVector: [0.1, 0.2],
      }),
    ).rejects.toThrow(/768/);
  });
});

describe("createVectorService.delete", () => {
  it("returns the count of removed rows", async () => {
    const embedder = createFakeEmbedder();
    const { db, captured } = createFakeDb({
      deleteResult: [{ id: "e1" }, { id: "e2" }, { id: "e3" }],
    });
    const service = createVectorService({ db, embedder });

    const result = await service.delete({
      userId: "u1",
      sourceType: "note",
      sourceId: "n1",
    });

    expect(captured.deleteCalled).toBe(true);
    expect(result).toEqual({ deleted: 3 });
  });

  it("supports namespace-only delete (without sourceId)", async () => {
    const embedder = createFakeEmbedder();
    const { db, captured } = createFakeDb({
      deleteResult: [{ id: "e1" }],
    });
    const service = createVectorService({ db, embedder });

    const result = await service.delete({
      userId: "u1",
      sourceType: "note",
    });

    expect(captured.deleteCalled).toBe(true);
    expect(result).toEqual({ deleted: 1 });
  });
});
