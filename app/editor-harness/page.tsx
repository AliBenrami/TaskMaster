import { EditorHarnessClient } from "@/app/editor-harness/editor-harness-client";
import { emptyNoteDocument } from "@/lib/notes/types";

export default async function EditorHarnessPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl px-6 py-10">
      <main className="w-full space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Editor Harness</h1>
          <p className="text-sm text-zinc-500">
            Minimal integration surface for the reusable Editor.js note editor component, with
            local save/reload verification only.
          </p>
        </div>

        <EditorHarnessClient initialDocument={emptyNoteDocument} />
      </main>
    </div>
  );
}
