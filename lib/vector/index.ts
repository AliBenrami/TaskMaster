import { db } from "@/lib/db";
import { markdownChunker } from "./chunker";
import { GeminiEmbedder } from "./embedder";
import { createVectorService, type VectorService } from "./service";

declare global {
  var __vectorService: VectorService | undefined;
}

function buildDefaultService(): VectorService {
  return createVectorService({
    db,
    embedder: new GeminiEmbedder(),
    chunker: markdownChunker(),
  });
}

function getDefaultService(): VectorService {
  if (process.env.NODE_ENV !== "production") {
    if (!globalThis.__vectorService) {
      globalThis.__vectorService = buildDefaultService();
    }
    return globalThis.__vectorService;
  }
  return buildDefaultService();
}

export const vectorService: VectorService = new Proxy({} as VectorService, {
  get(_target, prop, receiver) {
    return Reflect.get(getDefaultService(), prop, receiver);
  },
});

export { createVectorService } from "./service";
export { GeminiEmbedder } from "./embedder";
export { markdownChunker, noopChunker } from "./chunker";
export type * from "./types";
export type { VectorService } from "./service";
