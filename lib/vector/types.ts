export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export interface Embedder {
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[], taskType: EmbeddingTaskType): Promise<number[][]>;
}

export type Chunk = {
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
};

export interface Chunker {
  chunk(text: string, options?: Record<string, unknown>): Chunk[];
}

export type IngestInputBase = {
  userId: string;
  sourceType: string;
  sourceId: string;
};

export type IngestInputText = IngestInputBase & {
  text: string;
  metadata?: Record<string, unknown>;
  chunks?: undefined;
};

export type IngestInputChunked = IngestInputBase & {
  chunks: Chunk[];
  text?: undefined;
  metadata?: Record<string, unknown>;
};

export type IngestInput = IngestInputText | IngestInputChunked;

export type IngestedRecord = {
  id: string;
  chunkIndex: number;
  content: string;
  contentHash: string;
  metadata: Record<string, unknown>;
  embedding: number[];
};

export type IngestResult = {
  inserted: IngestedRecord[];
  skipped: Array<{ contentHash: string; reason: "duplicate" }>;
};

export type QueryOptionsBase = {
  userId: string;
  sourceType?: string;
  sourceId?: string;
  topK?: number;
  minScore?: number;
  metadataFilter?: Record<string, unknown>;
};

export type QueryOptionsByText = QueryOptionsBase & {
  queryText: string;
  queryVector?: undefined;
};

export type QueryOptionsByVector = QueryOptionsBase & {
  queryVector: number[];
  queryText?: undefined;
};

export type QueryOptions = QueryOptionsByText | QueryOptionsByVector;

export type QueryHit = {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
};

export type DeleteOptions = {
  userId: string;
  sourceType: string;
  sourceId?: string;
};

export type DeleteResult = {
  deleted: number;
};
