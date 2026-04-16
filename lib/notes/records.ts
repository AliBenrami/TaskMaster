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
  };
}

export function sortWorkspaceNotes(notes: WorkspaceNote[]) {
  return [...notes].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

