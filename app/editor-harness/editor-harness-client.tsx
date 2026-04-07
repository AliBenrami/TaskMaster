"use client";

import { NoteEditor } from "@/components/note-editor/note-editor";
import type { NoteDocument } from "@/lib/notes/types";

type EditorHarnessClientProps = {
  initialDocument: NoteDocument;
};

export function EditorHarnessClient({ initialDocument }: EditorHarnessClientProps) {
  return <NoteEditor initialDocument={initialDocument} />;
}
