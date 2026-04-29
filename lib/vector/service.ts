import { createHash } from "node:crypto";
import { and, cosineDistance, eq, inArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { embedding } from "@/lib/db/schema";
import type {
  Chunk,
  Chunker,
  DeleteOptions,
  DeleteResult,
  Embedder,
  IngestInput,
  IngestResult,
  IngestedRecord,
  QueryHit,
  QueryOptions,
} from "./types";

export type VectorDb = {
  insert: (
    table: typeof embedding,
  ) => {
    values: (rows: Array<typeof embedding.$inferInsert>) => {
      returning: () => Promise<Array<typeof embedding.$inferSelect>>;
    };
  };
  select: (fields?: Record<string, unknown>) => {
    from: (table: typeof embedding) => {
      where: (condition: SQL) => {
        orderBy?: (...args: unknown[]) => unknown;
        limit?: (count: number) => unknown;
      } & PromiseLike<unknown>;
    };
  };
  delete: (table: typeof embedding) => {
    where: (condition: SQL) => {
      returning: () => Promise<Array<{ id: string }>>;
    };
  };
};

type CreateServiceOptions = {
  db: unknown;
  embedder: Embedder;
  chunker?: Chunker;
};

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function chunksFromInput(input: IngestInput, chunker?: Chunker): Chunk[] {
  if (input.chunks) return input.chunks;

  if (!chunker) {
    throw new Error(
      "ingest({ text }) requires a chunker; configure one or pass `chunks` instead.",
    );
  }

  const baseChunks = chunker.chunk(input.text);
  if (input.metadata) {
    return baseChunks.map((chunk) => ({
      ...chunk,
      metadata: { ...input.metadata, ...(chunk.metadata ?? {}) },
    }));
  }
  return baseChunks;
}

function buildScopeFilter(
  userId: string,
  sourceType?: string,
  sourceId?: string,
): SQL {
  const conditions: SQL[] = [eq(embedding.userId, userId)];
  if (sourceType !== undefined) {
    conditions.push(eq(embedding.sourceType, sourceType));
  }
  if (sourceId !== undefined) {
    conditions.push(eq(embedding.sourceId, sourceId));
  }
  return and(...conditions) as SQL;
}

function buildMetadataFilter(filter: Record<string, unknown>): SQL {
  return sql`${embedding.metadata} @> ${JSON.stringify(filter)}::jsonb`;
}

export type VectorService = {
  ingest(input: IngestInput): Promise<IngestResult>;
  query(options: QueryOptions): Promise<QueryHit[]>;
  delete(options: DeleteOptions): Promise<DeleteResult>;
};

export function createVectorService(
  options: CreateServiceOptions,
): VectorService {
  const { embedder, chunker } = options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = options.db as any;

  return {
    async ingest(input: IngestInput): Promise<IngestResult> {
      const chunks = chunksFromInput(input, chunker);
      if (chunks.length === 0) {
        return { inserted: [], skipped: [] };
      }

      const hashes = chunks.map((chunk) => sha256Hex(chunk.content));

      const existing = await db
        .select({ contentHash: embedding.contentHash })
        .from(embedding)
        .where(
          and(
            eq(embedding.userId, input.userId),
            eq(embedding.sourceType, input.sourceType),
            eq(embedding.sourceId, input.sourceId),
            inArray(embedding.contentHash, hashes),
          ),
        );

      const existingHashes = new Set<string>(
        (existing as Array<{ contentHash: string }>).map(
          (row) => row.contentHash,
        ),
      );

      const skipped = hashes
        .filter((hash) => existingHashes.has(hash))
        .map((hash) => ({ contentHash: hash, reason: "duplicate" as const }));

      const newIndices: number[] = [];
      for (let index = 0; index < chunks.length; index += 1) {
        if (!existingHashes.has(hashes[index])) {
          newIndices.push(index);
        }
      }

      if (newIndices.length === 0) {
        return { inserted: [], skipped };
      }

      const newChunks = newIndices.map((index) => chunks[index]);
      const indicesNeedingEmbedding: number[] = [];
      const textsNeedingEmbedding: string[] = [];
      for (let position = 0; position < newChunks.length; position += 1) {
        const provided = newChunks[position].embedding;
        if (
          !provided ||
          !queryVectorIsValid(provided, embedder.dimensions)
        ) {
          indicesNeedingEmbedding.push(position);
          textsNeedingEmbedding.push(newChunks[position].content);
        }
      }

      const computedVectors =
        textsNeedingEmbedding.length > 0
          ? await embedder.embed(textsNeedingEmbedding, "RETRIEVAL_DOCUMENT")
          : [];

      const vectors: number[][] = newChunks.map((chunk) =>
        chunk.embedding && queryVectorIsValid(chunk.embedding, embedder.dimensions)
          ? chunk.embedding
          : ([] as number[]),
      );
      indicesNeedingEmbedding.forEach((position, idx) => {
        vectors[position] = computedVectors[idx];
      });

      const rows = newChunks.map((chunk, position) => ({
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        chunkIndex: newIndices[position],
        content: chunk.content,
        contentHash: hashes[newIndices[position]],
        metadata: chunk.metadata ?? {},
        embedding: vectors[position],
        model: embedder.model,
      }));

      const inserted = (await db
        .insert(embedding)
        .values(rows)
        .returning()) as Array<typeof embedding.$inferSelect>;

      const insertedRecords: IngestedRecord[] = inserted.map((row) => ({
        id: row.id,
        chunkIndex: row.chunkIndex,
        content: row.content,
        contentHash: row.contentHash,
        metadata: row.metadata,
        embedding: row.embedding,
      }));

      return { inserted: insertedRecords, skipped };
    },

    async query(opts: QueryOptions): Promise<QueryHit[]> {
      const topK = opts.topK ?? 8;

      let queryVector: number[];
      if (opts.queryVector) {
        if (queryVectorIsValid(opts.queryVector, embedder.dimensions)) {
          queryVector = opts.queryVector;
        } else {
          throw new Error(
            `queryVector must have ${embedder.dimensions} dimensions.`,
          );
        }
      } else {
        const [vector] = await embedder.embed([opts.queryText], "RETRIEVAL_QUERY");
        queryVector = vector;
      }

      const distance = cosineDistance(embedding.embedding, queryVector);
      const score = sql<number>`1 - (${distance})`;

      const conditions: SQL[] = [
        buildScopeFilter(opts.userId, opts.sourceType, opts.sourceId),
      ];
      if (opts.metadataFilter && Object.keys(opts.metadataFilter).length > 0) {
        conditions.push(buildMetadataFilter(opts.metadataFilter));
      }

      const rows = (await db
        .select({
          id: embedding.id,
          sourceType: embedding.sourceType,
          sourceId: embedding.sourceId,
          chunkIndex: embedding.chunkIndex,
          content: embedding.content,
          metadata: embedding.metadata,
          score,
        })
        .from(embedding)
        .where(and(...conditions))
        .orderBy(distance)
        .limit(topK)) as Array<{
        id: string;
        sourceType: string;
        sourceId: string;
        chunkIndex: number;
        content: string;
        metadata: Record<string, unknown>;
        score: number | string;
      }>;

      const hits: QueryHit[] = rows.map((row) => ({
        id: row.id,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        chunkIndex: row.chunkIndex,
        content: row.content,
        metadata: row.metadata ?? {},
        score: typeof row.score === "string" ? Number(row.score) : row.score,
      }));

      if (opts.minScore !== undefined) {
        return hits.filter((hit) => hit.score >= (opts.minScore as number));
      }
      return hits;
    },

    async delete(opts: DeleteOptions): Promise<DeleteResult> {
      const condition = buildScopeFilter(
        opts.userId,
        opts.sourceType,
        opts.sourceId,
      );
      const removed = (await db
        .delete(embedding)
        .where(condition)
        .returning({ id: embedding.id })) as Array<{ id: string }>;
      return { deleted: removed.length };
    },
  };
}

function queryVectorIsValid(values: number[], dimensions: number): boolean {
  return Array.isArray(values) && values.length === dimensions;
}
