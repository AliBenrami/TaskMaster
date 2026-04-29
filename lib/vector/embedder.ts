import { GoogleGenAI } from "@google/genai";
import type { Embedder, EmbeddingTaskType } from "./types";

const DEFAULT_DIMENSIONS = 768;
const DEFAULT_BATCH_SIZE = 100;

function l2Normalize(values: number[]): number[] {
  const magnitude = Math.sqrt(
    values.reduce((sum, value) => sum + value * value, 0),
  );
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error("Embedding vector has zero magnitude.");
  }
  return values.map((value) => value / magnitude);
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing. Add it to your server environment.`);
  }
  return value;
}

export type GeminiEmbedderOptions = {
  apiKey?: string;
  model?: string;
  dimensions?: number;
  batchSize?: number;
};

export class GeminiEmbedder implements Embedder {
  readonly model: string;
  readonly dimensions: number;
  private readonly client: GoogleGenAI;
  private readonly batchSize: number;

  constructor(options: GeminiEmbedderOptions = {}) {
    const apiKey = options.apiKey ?? getRequiredEnv("GOOGLE_GENERATIVE_AI_API_KEY");
    this.model = options.model ?? getRequiredEnv("GEMINI_EMBEDDINGS_MODEL");
    this.dimensions = options.dimensions ?? DEFAULT_DIMENSIONS;
    this.batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE);
    this.client = new GoogleGenAI({ apiKey });
  }

  async embed(
    texts: string[],
    taskType: EmbeddingTaskType,
  ): Promise<number[][]> {
    if (texts.length === 0) return [];

    const result: number[][] = [];

    for (let offset = 0; offset < texts.length; offset += this.batchSize) {
      const batch = texts.slice(offset, offset + this.batchSize);
      const response = await this.client.models.embedContent({
        model: this.model,
        contents: batch,
        config: {
          outputDimensionality: this.dimensions,
          taskType,
        },
      });

      const embeddings = response.embeddings ?? [];
      if (embeddings.length !== batch.length) {
        throw new Error(
          `Embedder returned ${embeddings.length} embeddings for ${batch.length} inputs.`,
        );
      }

      for (let index = 0; index < batch.length; index += 1) {
        const values = embeddings[index]?.values ?? [];
        if (values.length !== this.dimensions) {
          throw new Error(
            `Embedder returned ${values.length}-dim vector, expected ${this.dimensions}.`,
          );
        }
        result.push(l2Normalize(values));
      }
    }

    return result;
  }
}

export { l2Normalize };
