"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { NoteSurface } from "@/components/note-editor/note-surface";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  noteRecordToWorkspaceNote,
  sortWorkspaceNotes,
  type NoteGenerationMetadata,
  type NoteRecord,
  type WorkspaceNote,
} from "@/lib/notes/records";
import { emptyNoteDocument, type NoteContent } from "@/lib/notes/types";

type NotesWorkspaceProps = {
  displayName: string;
  initialNotes: WorkspaceNote[];
};

type GenerationResult = {
  fileName: string;
  parsedTextLength: number;
  topics: Array<{
    noteId: string;
    title: string;
    markdown: string;
    embedding: number[];
  }>;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(value: number | null) {
  if (!value) {
    return null;
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function getRenderableTitle(value: string) {
  return value.trim() || "Untitled";
}

function formatVectorPreview(values: number[]) {
  return values.slice(0, 8).map((value) => value.toFixed(4)).join(", ");
}

function getVectorMagnitude(values: number[]) {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
}

function formatFullVector(values: number[]) {
  return `[${values.map((value) => Number(value.toFixed(8))).join(", ")}]`;
}

export function NotesWorkspace({ displayName, initialNotes }: NotesWorkspaceProps) {
  const [notes, setNotes] = useState(() => sortWorkspaceNotes(initialNotes));
  const [selectedId, setSelectedId] = useState<string | null>(() => initialNotes[0]?.id ?? null);
  const [titleDraftState, setTitleDraftState] = useState(() => ({
    noteId: initialNotes[0]?.id ?? null,
    value: initialNotes[0]?.title ?? "Untitled",
  }));
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );
  const draftTitle =
    selectedNote && titleDraftState.noteId === selectedNote.id
      ? titleDraftState.value
      : (selectedNote?.title ?? "Untitled");

  async function readNoteRecord(response: Response) {
    const payload = (await response.json().catch(() => null)) as
      | (NoteRecord & { error?: string })
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error || "The notes request failed.");
    }

    return noteRecordToWorkspaceNote(payload as NoteRecord);
  }

  function mergeNote(nextNote: WorkspaceNote) {
    setNotes((current) =>
      sortWorkspaceNotes([
        nextNote,
        ...current.filter((note) => note.id !== nextNote.id),
      ]),
    );
  }

  function mergeNotes(nextNotes: WorkspaceNote[]) {
    setNotes((current) =>
      sortWorkspaceNotes([
        ...nextNotes,
        ...current.filter((note) => !nextNotes.some((nextNote) => nextNote.id === note.id)),
      ]),
    );
  }

  async function saveNote(noteId: string, patch: { title?: string; content?: NoteContent }) {
    setError(null);
    setStatus("Saving note...");

    const response = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.content ? { content: patch.content.document } : {}),
      }),
    });

    const updatedNote = await readNoteRecord(response);
    mergeNote(updatedNote);
    setTitleDraftState((current) =>
      current.noteId === updatedNote.id
        ? { noteId: updatedNote.id, value: updatedNote.title }
        : current,
    );
    setStatus(`Saved ${formatTimestamp(updatedNote.updatedAt)}`);
  }

  async function handleCreateNote() {
    setError(null);
    setStatus("Creating a new note...");
    setGenerationResult(null);

    const response = await fetch("/api/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Untitled",
        content: {
          ...emptyNoteDocument,
          blocks: [],
        },
      }),
    });

    const createdNote = await readNoteRecord(response);
    mergeNote(createdNote);
    setSelectedId(createdNote.id);
    setTitleDraftState({
      noteId: createdNote.id,
      value: createdNote.title,
    });
    setStatus("New note created.");
  }

  async function handleDeleteNote() {
    if (!selectedNote) {
      return;
    }

    if (!window.confirm(`Delete "${getRenderableTitle(selectedNote.title)}"?`)) {
      return;
    }

    setError(null);
    setStatus("Deleting note...");
    setGenerationResult(null);

    const response = await fetch(`/api/notes/${selectedNote.id}`, {
      method: "DELETE",
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error || "Could not delete the selected note.");
      setStatus(null);
      return;
    }

    setNotes((current) => {
      const remaining = current.filter((note) => note.id !== selectedNote.id);
      setSelectedId(remaining[0]?.id ?? null);
      return remaining;
    });
    setStatus("Note deleted.");
  }

  async function handleUploadFile(file: File) {
    setError(null);
    setGenerationResult(null);
    setStatus(`Generating notes from ${file.name}...`);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", file.name.replace(/\.[^.]+$/, "") || "Uploaded Note");

    const response = await fetch("/api/notes/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          notes?: NoteRecord[];
          parsedTextLength?: number;
          topics?: Array<{
            noteId?: string;
            title?: string;
            markdown?: string;
            embedding?: number[];
          }>;
          error?: string;
        }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error || "Could not generate notes from the uploaded file.");
    }

    const createdNotes = (payload?.notes ?? []).map((record) => noteRecordToWorkspaceNote(record));
    if (createdNotes.length === 0) {
      throw new Error("The note generation pipeline completed without returning notes.");
    }

    mergeNotes(createdNotes);
    setSelectedId(createdNotes[0].id);
    setGenerationResult({
      fileName: file.name,
      parsedTextLength: payload?.parsedTextLength ?? 0,
      topics: (payload?.topics ?? []).map((topic, index) => ({
        noteId: topic.noteId || createdNotes[index]?.id || "",
        title: topic.title || createdNotes[index]?.title || "Generated Topic",
        markdown: topic.markdown || createdNotes[index]?.content.markdown || "",
        embedding: Array.isArray(topic.embedding) ? topic.embedding : [],
      })),
    });
    setStatus(`Generated ${createdNotes.length} topic note${createdNotes.length === 1 ? "" : "s"} from ${file.name}.`);
  }

  async function handleTitleCommit() {
    if (!selectedNote) {
      return;
    }

    const nextTitle = draftTitle.trim() || "Untitled";
    if (nextTitle === getRenderableTitle(selectedNote.title)) {
      if (selectedNote.title !== nextTitle) {
        mergeNote({ ...selectedNote, title: nextTitle });
      }
      return;
    }

    try {
      await saveNote(selectedNote.id, { title: nextTitle });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not update the note title.",
      );
      setStatus(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:py-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white px-6 py-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Notes workspace
              </p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Connected notes editor</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  Manual notes, uploaded note records, and the Markdown surface now run against the
                  notes API instead of the isolated editor harness.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {displayName}
              </span>
              <Link
                href="/parse-test"
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
              >
                ParseTest
              </Link>
              <SignOutButton />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => startTransition(() => void handleCreateNote())}
              disabled={isPending}
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            >
              New note
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
            >
              Generate from file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) {
                  return;
                }
                startTransition(() => {
                  void handleUploadFile(file).catch((uploadError) => {
                    setError(
                      uploadError instanceof Error
                        ? uploadError.message
                        : "Could not generate notes from the uploaded file.",
                    );
                    setStatus(null);
                  });
                });
              }}
            />
            {status ? <p className="text-sm text-zinc-500 dark:text-zinc-400">{status}</p> : null}
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Your notes
              </h2>
              <span className="text-sm text-zinc-500">{notes.length}</span>
            </div>

            {notes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                Create a note or generate notes from a file to start building your notes library.
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => {
                  const isSelected = note.id === selectedId;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => {
                        setError(null);
                        setStatus(null);
                        setSelectedId(note.id);
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                          : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-950"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="line-clamp-2 text-sm font-medium">
                            {getRenderableTitle(note.title)}
                          </p>
                          <p
                            className={`mt-1 text-xs ${
                              isSelected ? "text-zinc-200 dark:text-zinc-700" : "text-zinc-500"
                            }`}
                          >
                            {note.sourceType === "upload" ? "Imported file" : "Manual note"}
                            {note.generation ? ` - Topic ${note.generation.topicIndex + 1}/${note.generation.topicCount}` : ""}
                          </p>
                        </div>
                        {note.fileName ? (
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] ${
                              isSelected
                                ? "bg-white/10 text-white dark:bg-zinc-900 dark:text-zinc-100"
                                : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {note.fileName.split(".").pop()?.toUpperCase() || "FILE"}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={`mt-3 text-xs ${
                          isSelected ? "text-zinc-200 dark:text-zinc-700" : "text-zinc-500"
                        }`}
                      >
                        Updated {formatTimestamp(note.updatedAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {selectedNote ? (
              <>
                <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <input
                        value={draftTitle}
                        onChange={(event) => {
                          const nextTitle = event.currentTarget.value;
                          setTitleDraftState({
                            noteId: selectedNote.id,
                            value: nextTitle,
                          });
                          setNotes((current) =>
                            current.map((note) =>
                              note.id === selectedNote.id ? { ...note, title: nextTitle } : note,
                            ),
                          );
                        }}
                        onBlur={() => void handleTitleCommit()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                        }}
                        className="w-full border-none bg-transparent p-0 text-2xl font-semibold tracking-tight outline-none placeholder:text-zinc-400"
                        placeholder="Untitled"
                      />
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                          {selectedNote.sourceType === "upload" ? "Imported note" : "Manual note"}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                          Created {formatTimestamp(selectedNote.createdAt)}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                          Last saved {formatTimestamp(selectedNote.updatedAt)}
                        </span>
                        {selectedNote.fileName ? (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                            {selectedNote.fileName}
                            {selectedNote.fileSize ? ` · ${formatFileSize(selectedNote.fileSize)}` : ""}
                          </span>
                        ) : null}
                        {selectedNote.generation ? (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                            {selectedNote.generation.embeddingDimensions}D embedding
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => startTransition(() => void handleDeleteNote())}
                      disabled={isPending}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Delete note
                    </button>
                  </div>
                </div>

                <div className="px-3 pb-3 pt-1 md:px-4 md:pb-4">
                  {selectedNote.generation ? (
                    <GeneratedNoteVectorPanel generation={selectedNote.generation} />
                  ) : null}
                  <NoteSurface
                    initialDocument={selectedNote.content.document}
                    keepEditingWhenEmpty
                    onSave={async (nextContent) => {
                      try {
                        await saveNote(selectedNote.id, {
                          title: draftTitle.trim() || "Untitled",
                          content: nextContent,
                        });
                      } catch (saveError) {
                        setError(
                          saveError instanceof Error
                            ? saveError.message
                            : "Could not save note changes.",
                        );
                        setStatus(null);
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex min-h-[70vh] items-center justify-center px-6 py-12">
                <div className="max-w-lg space-y-4 text-center">
                  <h2 className="text-2xl font-semibold tracking-tight">No note selected</h2>
                  <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                    Create a manual note or upload an image or PDF for generated topic notes. Once
                    selected, the existing note editor will save straight to the notes API.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => startTransition(() => void handleCreateNote())}
                      disabled={isPending}
                      className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                    >
                      Create your first note
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPending}
                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
                    >
                      Generate from file
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
        {generationResult ? <GenerationResultPanel result={generationResult} /> : null}
      </main>
    </div>
  );
}

function GeneratedNoteVectorPanel({ generation }: { generation: NoteGenerationMetadata }) {
  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          Generated topic {generation.topicIndex + 1}/{generation.topicCount}: {generation.topicTitle}
        </p>
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          L2 {getVectorMagnitude(generation.embedding).toFixed(4)} · {generation.embedding.length} values
        </p>
      </div>
      <p className="mt-2 break-all font-mono text-xs text-emerald-800 dark:text-emerald-200">
        [{formatVectorPreview(generation.embedding)}
        {generation.embedding.length > 8 ? ", ..." : ""}]
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-emerald-800 dark:text-emerald-200">
          Full vector
        </summary>
        <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded-xl bg-white/70 p-3 text-xs text-emerald-950 dark:bg-zinc-950/70 dark:text-emerald-100">
          {formatFullVector(generation.embedding)}
        </pre>
      </details>
    </div>
  );
}

function GenerationResultPanel({ result }: { result: GenerationResult }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Generated notes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {result.fileName} · {result.parsedTextLength.toLocaleString()} parsed characters · {result.topics.length} topic notes
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {result.topics.map((topic, index) => (
          <article
            key={`${topic.noteId}-${index}`}
            className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h3 className="line-clamp-2 text-sm font-semibold">{topic.title}</h3>
            <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {topic.markdown}
            </p>
            <div className="mt-3 rounded-xl bg-zinc-100 p-3 dark:bg-zinc-950">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <span>{topic.embedding.length}D L2-normalized vector</span>
                <span>magnitude {getVectorMagnitude(topic.embedding).toFixed(4)}</span>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
                [{formatVectorPreview(topic.embedding)}
                {topic.embedding.length > 8 ? ", ..." : ""}]
              </p>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Full vector
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  {formatFullVector(topic.embedding)}
                </pre>
              </details>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
