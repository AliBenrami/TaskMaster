"use client";

import { NoteSurface } from "@/components/note-editor/note-surface";
import type { NoteDocument } from "@/lib/notes/types";

type EditorHarnessClientProps = {
  initialDocument: NoteDocument;
};

export function EditorHarnessClient({ initialDocument }: EditorHarnessClientProps) {
  return <NoteSurface initialDocument={initialDocument} />;
}
