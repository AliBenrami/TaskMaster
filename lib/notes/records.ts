import { createNoteContent } from "@/lib/notes/markdown";
import { emptyNoteDocument, NoteDocumentSchema, type NoteContent, type NoteDocument } from "@/lib/notes/types";

export type NoteSourceType = "manual" | "upload";

export type NoteRecord = {
  id: string;
  title: string;
  content: unknown;
  sourceType: NoteSourceType;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type NoteGenerationMetadata = {
  fileName: string;
  sourceTitle: string;
  topicTitle: string;
  topicIndex: number;
  topicCount: number;
  markdown: string;
  embedding: number[];
  embeddingDimensions: number;
  embeddingModel?: string;
};

export type WorkspaceNote = {
  id: string;
  title: string;
  sourceType: NoteSourceType;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
  updatedAt: string;
  content: NoteContent;
  generation: NoteGenerationMetadata | null;
};

function createEmptyDocument(): NoteDocument {
  return {
    ...emptyNoteDocument,
    blocks: [],
  };
}

function normalizeDate(value: string | Date) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

export function normalizeNoteDocument(value: unknown): NoteDocument {
  if (!value) {
    return createEmptyDocument();
  }

  const parsed = NoteDocumentSchema.safeParse(value);
  if (!parsed.success) {
    return createEmptyDocument();
  }

  return parsed.data;
}

function normalizeNoteGeneration(value: unknown): NoteGenerationMetadata | null {
  if (!value || typeof value !== "object" || !("noteGeneration" in value)) {
    return null;
  }

  const metadata = (value as { noteGeneration?: unknown }).noteGeneration;
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const candidate = metadata as Partial<NoteGenerationMetadata>;
  if (
    typeof candidate.fileName !== "string" ||
    typeof candidate.sourceTitle !== "string" ||
    typeof candidate.topicTitle !== "string" ||
    typeof candidate.topicIndex !== "number" ||
    typeof candidate.topicCount !== "number" ||
    typeof candidate.markdown !== "string" ||
    !Array.isArray(candidate.embedding)
  ) {
    return null;
  }

  const embedding = candidate.embedding.filter((value): value is number => typeof value === "number");

  return {
    fileName: candidate.fileName,
    sourceTitle: candidate.sourceTitle,
    topicTitle: candidate.topicTitle,
    topicIndex: candidate.topicIndex,
    topicCount: candidate.topicCount,
    markdown: candidate.markdown,
    embedding,
    embeddingDimensions:
      typeof candidate.embeddingDimensions === "number"
        ? candidate.embeddingDimensions
        : embedding.length,
    embeddingModel:
      typeof candidate.embeddingModel === "string" ? candidate.embeddingModel : undefined,
  };
}

export function noteRecordToWorkspaceNote(record: NoteRecord): WorkspaceNote {
  const document = normalizeNoteDocument(record.content);

  return {
    id: record.id,
    title: record.title,
    sourceType: record.sourceType,
    fileName: record.fileName,
    mimeType: record.mimeType,
    fileSize: record.fileSize,
    createdAt: normalizeDate(record.createdAt),
    updatedAt: normalizeDate(record.updatedAt),
    content: createNoteContent(document),
    generation: normalizeNoteGeneration(record.content),
  };
}

export function sortWorkspaceNotes(notes: WorkspaceNote[]) {
  return [...notes].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}
