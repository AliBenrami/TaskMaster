import { EditorHarnessClient } from "@/app/editor-harness/editor-harness-client";
import { defaultTestNote } from "@/lib/notes/default-note";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl px-6 py-10">
      <main className="w-full space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Root Note Editor Test</h1>
          <p className="text-sm text-zinc-500">
            Seeded local test note for exercising the reusable editor from the root route.
          </p>
        </div>

        <EditorHarnessClient initialDocument={defaultTestNote} />
      </main>
    </div>
  );
}
