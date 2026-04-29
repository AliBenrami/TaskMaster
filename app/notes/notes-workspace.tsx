"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NoteSurface } from "@/components/note-editor/note-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/input";
import { cx } from "@/lib/utils";
import {
  noteRecordToWorkspaceNote,
  sortWorkspaceNotes,
  type NoteGenerationMetadata,
  type NoteRecord,
  type WorkspaceNote,
} from "@/lib/notes/records";
import { emptyNoteDocument, type NoteContent } from "@/lib/notes/types";

type WorkspaceClass = {
  id: string;
  runId: string;
  title: string;
  courseCode: string | null;
  noteCount: number;
};

type NotesWorkspaceProps = {
  initialNotes: WorkspaceNote[];
  classes: WorkspaceClass[];
  initialClassId: string | null;
  shouldCreateOnMount: boolean;
  resetHref: string;
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

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatTimestamp(value: string) {
  return TIMESTAMP_FORMATTER.format(new Date(value));
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

function getClassFilterId(selectedFilter: string) {
  if (selectedFilter === "all" || selectedFilter === "unfiled") {
    return null;
  }

  return selectedFilter;
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

export function NotesWorkspace({
  initialNotes,
  classes,
  initialClassId,
  shouldCreateOnMount,
  resetHref,
}: NotesWorkspaceProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(() => sortWorkspaceNotes(initialNotes));
  const [selectedFilter, setSelectedFilter] = useState(() => initialClassId ?? "all");
  const [selectedId, setSelectedId] = useState<string | null>(() => initialNotes[0]?.id ?? null);
  const [titleDraftState, setTitleDraftState] = useState(() => ({
    noteId: initialNotes[0]?.id ?? null,
    value: initialNotes[0]?.title ?? "Untitled",
  }));
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasHandledCreateOnMountRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const classesById = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);
  const filteredNotes = useMemo(() => {
    if (selectedFilter === "all") {
      return notes;
    }

    if (selectedFilter === "unfiled") {
      return notes.filter((note) => !note.classId);
    }

    return notes.filter((note) => note.classId === selectedFilter);
  }, [notes, selectedFilter]);
  const selectedNote = useMemo(
    () => filteredNotes.find((note) => note.id === selectedId) ?? filteredNotes[0] ?? null,
    [filteredNotes, selectedId],
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
      sortWorkspaceNotes([nextNote, ...current.filter((note) => note.id !== nextNote.id)]),
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

  async function saveNote(
    noteId: string,
    patch: { title?: string; content?: NoteContent; classId?: string | null },
  ) {
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
        ...(patch.classId !== undefined ? { classId: patch.classId } : {}),
      }),
    });

    const updatedNote = await readNoteRecord(response);
    mergeNote(updatedNote);
    setTitleDraftState((current) =>
      current.noteId === updatedNote.id ? { noteId: updatedNote.id, value: updatedNote.title } : current,
    );
    setStatus(`Saved ${formatTimestamp(updatedNote.updatedAt)}`);
  }

  async function handleCreateNote(classId?: string | null, silent = false) {
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
        classId: classId ?? null,
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
    if (!silent && createdNote.classId) {
      setSelectedFilter(createdNote.classId);
    }
    setStatus("New note created.");
  }

  const createNoteFromCurrentFilter = useEffectEvent((silent: boolean) => {
    startTransition(() => void handleCreateNote(getClassFilterId(selectedFilter), silent));
  });

  useEffect(() => {
    if (!shouldCreateOnMount || hasHandledCreateOnMountRef.current) {
      return;
    }

    hasHandledCreateOnMountRef.current = true;
    createNoteFromCurrentFilter(true);
    router.replace(resetHref);
  }, [resetHref, router, shouldCreateOnMount]);

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

    setNotes((current) => current.filter((note) => note.id !== selectedNote.id));
    setStatus("Note deleted.");
  }

  async function handleUploadFile(file: File, classId?: string | null) {
    setError(null);
    setGenerationResult(null);
    setStatus(`Generating notes from ${file.name}...`);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", file.name.replace(/\.[^.]+$/, "") || "Uploaded Note");
    if (classId) {
      formData.set("classId", classId);
    }

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
      setError(saveError instanceof Error ? saveError.message : "Could not update the note title.");
      setStatus(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Connected workspace"
        title="Notes"
        description="Notes stay fully functional, but now they can be filed under classes created by syllabus parsing."
        actions={
          <>
            <Button
              type="button"
              onClick={() => startTransition(() => void handleCreateNote(getClassFilterId(selectedFilter)))}
              disabled={isPending}
            >
              New note
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              Generate from file
            </Button>
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
                  void handleUploadFile(file, getClassFilterId(selectedFilter)).catch((uploadError) => {
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
          </>
        }
      />

      {status || error ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {status ? <p className="text-muted-foreground">{status}</p> : null}
          {error ? <p className="text-danger">{error}</p> : null}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Your notes
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{filteredNotes.length} in view</p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedFilter("all")}
              className={cx(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                selectedFilter === "all" ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted-foreground",
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("unfiled")}
              className={cx(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                selectedFilter === "unfiled"
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-muted text-muted-foreground",
              )}
            >
              Unfiled
            </button>
            {classes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedFilter(item.id)}
                className={cx(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  selectedFilter === item.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-muted text-muted-foreground",
                )}
              >
                {item.courseCode ? `${item.courseCode} - ` : ""}
                {item.title}
              </button>
            ))}
          </div>

          {filteredNotes.length === 0 ? (
            <EmptyState
              title="No notes here yet"
              description={
                selectedFilter === "all"
                  ? "Create a note or generate notes from a file to start building your notes library."
                  : "Create or move a note into this class to start building its study context."
              }
              eyebrow="Notes"
              action={
                <Button
                  type="button"
                  onClick={() => startTransition(() => void handleCreateNote(getClassFilterId(selectedFilter)))}
                  disabled={isPending}
                >
                  Create note
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredNotes.map((note) => {
                const isSelected = note.id === selectedNote?.id;
                const linkedClass = note.classId ? classesById.get(note.classId) ?? null : null;

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStatus(null);
                      setSelectedId(note.id);
                    }}
                    className={cx(
                      "w-full rounded-[var(--radius-lg)] border px-4 py-3 text-left transition",
                      isSelected
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-surface-muted hover:border-border-strong hover:bg-surface",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">
                          {getRenderableTitle(note.title)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {note.sourceType === "upload" ? "Imported file" : "Manual note"}
                          </Badge>
                          {linkedClass ? <Badge variant="accent">{linkedClass.title}</Badge> : null}
                        </div>
                        {note.generation ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Topic {note.generation.topicIndex + 1}/{note.generation.topicCount}
                          </p>
                        ) : null}
                      </div>
                      {note.fileName ? (
                        <Badge variant="neutral">
                          {note.fileName.split(".").pop()?.toUpperCase() || "FILE"}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Updated {formatTimestamp(note.updatedAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          {selectedNote ? (
            <>
              <div className="border-b border-border px-6 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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
                      className="w-full border-none bg-transparent p-0 text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder="Untitled"
                    />
                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">
                          {selectedNote.sourceType === "upload" ? "Imported note" : "Manual note"}
                        </Badge>
                        <Badge variant="outline">Created {formatTimestamp(selectedNote.createdAt)}</Badge>
                        <Badge variant="outline">Last saved {formatTimestamp(selectedNote.updatedAt)}</Badge>
                        {selectedNote.fileName ? (
                          <Badge variant="outline">
                            {selectedNote.fileName}
                            {selectedNote.fileSize ? ` - ${formatFileSize(selectedNote.fileSize)}` : ""}
                          </Badge>
                        ) : null}
                        {selectedNote.generation ? (
                          <Badge variant="outline">
                            {selectedNote.generation.embeddingDimensions}D embedding
                          </Badge>
                        ) : null}
                      </div>
                      <Select
                        aria-label="Select class"
                        value={selectedNote.classId ?? ""}
                        onChange={(event) => {
                          const nextClassId = event.currentTarget.value || null;
                          setNotes((current) =>
                            current.map((note) =>
                              note.id === selectedNote.id ? { ...note, classId: nextClassId } : note,
                            ),
                          );
                          startTransition(() => void saveNote(selectedNote.id, { classId: nextClassId }));
                        }}
                      >
                        <option value="">No class</option>
                        {classes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.courseCode ? `${item.courseCode} - ` : ""}
                            {item.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => startTransition(() => void handleDeleteNote())}
                    disabled={isPending}
                  >
                    Delete note
                  </Button>
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
                        saveError instanceof Error ? saveError.message : "Could not save note changes.",
                      );
                      setStatus(null);
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No note selected"
                description="Pick a note from the left or create one directly inside the current class filter."
                eyebrow="Editor"
                action={
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => startTransition(() => void handleCreateNote(getClassFilterId(selectedFilter)))}
                      disabled={isPending}
                    >
                      Create note
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPending}
                    >
                      Generate from file
                    </Button>
                  </div>
                }
              />
            </div>
          )}
        </Card>
      </div>

      {selectedFilter !== "all" && getClassFilterId(selectedFilter) ? (
        <div className="text-sm text-muted-foreground">
          Working inside{" "}
          <Link
            href={`/classes/${classesById.get(getClassFilterId(selectedFilter) ?? "")?.runId ?? ""}?tab=notes`}
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            {classesById.get(getClassFilterId(selectedFilter) ?? "")?.title}
          </Link>
          . New notes and imports will link to this class by default.
        </div>
      ) : null}

      {generationResult ? <GenerationResultPanel result={generationResult} /> : null}
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
    <section className="rounded-3xl border border-border bg-surface-muted p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Generated notes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.fileName} · {result.parsedTextLength.toLocaleString()} parsed characters ·{" "}
            {result.topics.length} topic notes
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {result.topics.map((topic, index) => (
          <article key={`${topic.noteId}-${index}`} className="rounded-2xl border border-border bg-surface p-4">
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{topic.title}</h3>
            <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {topic.markdown}
            </p>
            <div className="mt-3 rounded-xl bg-surface-muted p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{topic.embedding.length}D L2-normalized vector</span>
                <span>magnitude {getVectorMagnitude(topic.embedding).toFixed(4)}</span>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-foreground">
                [{formatVectorPreview(topic.embedding)}
                {topic.embedding.length > 8 ? ", ..." : ""}]
              </p>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Full vector
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-2 text-xs text-foreground">
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
