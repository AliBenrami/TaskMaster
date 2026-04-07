"use client";

import { useState } from "react";
import { NoteEditor } from "@/components/note-editor/note-editor";
import { NoteRenderer } from "@/components/note-editor/note-renderer";
import type { NoteDocument } from "@/lib/notes/types";

type EditorHarnessClientProps = {
  initialDocument: NoteDocument;
};

export function EditorHarnessClient({
  initialDocument,
}: EditorHarnessClientProps) {
  const [editorRevision, setEditorRevision] = useState(0);
  const [previewDocument, setPreviewDocument] = useState<NoteDocument>(initialDocument);
  const [savedDocument, setSavedDocument] = useState<NoteDocument>(initialDocument);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 text-sm text-zinc-500">
        <div>
          Local harness saves to an in-memory snapshot only. Use “Reload saved snapshot” to
          verify save/load round-tripping without any database work.
        </div>
        <button
          type="button"
          onClick={() => {
            setPreviewDocument(savedDocument);
            setEditorRevision((current) => current + 1);
          }}
          className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium dark:border-zinc-700"
        >
          Reload saved snapshot
        </button>
      </div>
      {lastSavedAt ? <div className="text-sm text-zinc-500">Last saved: {new Date(lastSavedAt).toLocaleString()}</div> : null}

      <NoteEditor
        key={editorRevision}
        initialDocument={savedDocument}
        onDocumentChange={setPreviewDocument}
        onSave={async (document) => {
          setSavedDocument(document);
          setPreviewDocument(document);
          setLastSavedAt(new Date().toISOString());
        }}
      />

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold tracking-tight">Read-only preview</h2>
        <NoteRenderer document={previewDocument} />
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold tracking-tight">Saved snapshot preview</h2>
        <NoteRenderer document={savedDocument} />
      </section>
    </div>
  );
}
