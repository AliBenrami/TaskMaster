import { EditorHarnessClient } from "@/app/editor-harness/editor-harness-client";
import { emptyNoteDocument } from "@/lib/notes/types";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl px-6 py-6 md:px-10 md:py-8">
      <main className="w-full">
        <EditorHarnessClient initialDocument={emptyNoteDocument} />
        new
      </main>
    </div>
  );
}
