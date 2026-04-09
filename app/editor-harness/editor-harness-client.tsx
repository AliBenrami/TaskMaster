"use client";

import { useState } from "react";
import { NoteEditor } from "@/components/note-editor/note-editor";
import { NoteRenderer } from "@/components/note-editor/note-renderer";
import { createNoteContent } from "@/lib/notes/markdown";
import type { NoteContent, NoteDocument } from "@/lib/notes/types";

type EditorHarnessClientProps = {
  initialDocument: NoteDocument;
};

export function EditorHarnessClient({ initialDocument }: EditorHarnessClientProps) {
  const [content, setContent] = useState<NoteContent>(() => createNoteContent(initialDocument));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.95fr)]">
      <NoteEditor initialDocument={initialDocument} onContentChange={setContent} />
      <aside className="space-y-6 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-950/40">
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Markdown Output
            </h2>
            <p className="text-sm text-zinc-500">
              The saved note contract now emits Markdown as the primary app-facing format.
            </p>
          </div>
          <pre className="max-h-[24rem] overflow-auto rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            <code>{content.markdown || "_No Markdown generated yet._"}</code>
          </pre>
        </section>

        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Rendered Preview
            </h2>
            <p className="text-sm text-zinc-500">
              Preview is rendered from the saved Markdown, not from Editor.js blocks.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <NoteRenderer markdown={content.markdown} />
          </div>
        </section>
      </aside>
    </div>
  );
}
