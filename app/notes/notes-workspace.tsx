"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { NoteSurface } from "@/components/note-editor/note-surface";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { cx } from "@/lib/utils";
import {
  noteRecordToWorkspaceNote,
  sortWorkspaceNotes,
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

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatTimestamp(value: string) {
  return TIMESTAMP_FORMATTER.format(new Date(value));
}

function getRenderableTitle(value: string) {
  return value.trim() || "Untitled";
}

function getClassLabel(item: WorkspaceClass) {
  return item.courseCode ? `${item.courseCode} ${item.title}` : item.title;
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
  const initialSelectedNote = initialClassId
    ? (initialNotes.find((note) => note.classId === initialClassId) ??
      initialNotes[0] ??
      null)
    : (initialNotes[0] ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialSelectedNote?.id ?? null,
  );
  const [titleDraftState, setTitleDraftState] = useState(() => ({
    noteId: initialSelectedNote?.id ?? null,
    value: initialSelectedNote?.title ?? "Untitled",
  }));
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasHandledCreateOnMountRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedIdRef = useRef<string | null>(initialSelectedNote?.id ?? null);
  const classesById = useMemo(
    () => new Map(classes.map((item) => [item.id, item])),
    [classes],
  );
  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? notes[0] ?? null,
    [notes, selectedId],
  );
  const recentNotes = useMemo(
    () => sortWorkspaceNotes(notes).slice(0, 8),
    [notes],
  );
  const groupedNotes = useMemo(
    () => [
      ...classes.map((item) => ({
        id: item.id,
        title: getClassLabel(item),
        classId: item.id,
        notes: notes.filter((note) => note.classId === item.id),
      })),
      {
        id: "unfiled",
        title: "Unfiled",
        classId: null,
        notes: notes.filter((note) => !note.classId),
      },
    ],
    [classes, notes],
  );
  const draftTitle =
    selectedNote && titleDraftState.noteId === selectedNote.id
      ? titleDraftState.value
      : (selectedNote?.title ?? "Untitled");
  const fallbackClassId = initialClassId ?? selectedNote?.classId ?? null;

  useEffect(() => {
    selectedIdRef.current = selectedNote?.id ?? null;
  }, [selectedNote?.id]);

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
        ...current.filter(
          (note) => !nextNotes.some((nextNote) => nextNote.id === note.id),
        ),
      ]),
    );
  }

  function toggleGroup(groupId: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  function selectNote(note: WorkspaceNote) {
    setError(null);
    setStatus(null);
    setSelectedId(note.id);
    setTitleDraftState({
      noteId: note.id,
      value: note.title,
    });
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
      current.noteId === updatedNote.id
        ? { noteId: updatedNote.id, value: updatedNote.title }
        : current,
    );
    if (selectedIdRef.current === updatedNote.id) {
      setStatus(`Saved ${formatTimestamp(updatedNote.updatedAt)}`);
    }
  }

  async function handleCreateNote(classId?: string | null, silent = false) {
    setError(null);
    setStatus("Creating a new note...");

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
      setCollapsedGroups((current) => {
        const next = new Set(current);
        next.delete(createdNote.classId ?? "");
        return next;
      });
    }
    setStatus("New note created.");
  }

  const createNoteFromCurrentFilter = useEffectEvent((silent: boolean) => {
    startTransition(() => void handleCreateNote(fallbackClassId, silent));
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

    if (
      !window.confirm(`Delete "${getRenderableTitle(selectedNote.title)}"?`)
    ) {
      return;
    }

    setError(null);
    setStatus("Deleting note...");

    const response = await fetch(`/api/notes/${selectedNote.id}`, {
      method: "DELETE",
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    if (!response.ok) {
      setError(payload?.error || "Could not delete the selected note.");
      setStatus(null);
      return;
    }

    setNotes((current) =>
      current.filter((note) => note.id !== selectedNote.id),
    );
    setStatus("Note deleted.");
  }

  async function handleUploadFile(file: File, classId?: string | null) {
    setError(null);
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

    const payload = (await response.json().catch(() => null)) as {
      notes?: NoteRecord[];
      parsedTextLength?: number;
      error?: string;
    } | null;

    if (!response.ok) {
      throw new Error(
        payload?.error || "Could not generate notes from the uploaded file.",
      );
    }

    const createdNotes = (payload?.notes ?? []).map((record) =>
      noteRecordToWorkspaceNote(record),
    );
    if (createdNotes.length === 0) {
      throw new Error(
        "The note generation pipeline completed without returning notes.",
      );
    }

    mergeNotes(createdNotes);
    setSelectedId(createdNotes[0].id);
    setStatus(
      `Generated ${createdNotes.length} topic note${createdNotes.length === 1 ? "" : "s"} from ${file.name}.`,
    );
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
        saveError instanceof Error
          ? saveError.message
          : "Could not update the note title.",
      );
      setStatus(null);
    }
  }

  const renderNoteItem = (
    note: WorkspaceNote,
    options?: { compact?: boolean },
  ) => {
    const isSelected = note.id === selectedNote?.id;
    const linkedClass = note.classId
      ? (classesById.get(note.classId) ?? null)
      : null;

    return (
      <button
        key={note.id}
        type="button"
        onClick={() => selectNote(note)}
        className={cx(
          "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
          isSelected
            ? "bg-surface-elevated text-foreground"
            : "text-muted-foreground hover:bg-surface hover:text-foreground",
        )}
      >
        <FileText className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium">
          {getRenderableTitle(note.title)}
        </span>
        {options?.compact ? null : (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatTimestamp(note.updatedAt)}
          </span>
        )}
        {options?.compact && linkedClass ? (
          <span className="max-w-20 shrink-0 truncate text-[11px] text-muted-foreground">
            {getClassLabel(linkedClass)}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="h-full min-h-0 overflow-hidden bg-surface">
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
            void handleUploadFile(
              file,
              selectedNote?.classId ?? fallbackClassId,
            ).catch((uploadError) => {
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

      <div className="grid h-full min-h-0 lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="flex h-full min-h-0 flex-col border-b border-border bg-surface-muted/70 lg:border-b-0 lg:border-r">
          <div className="flex h-12 items-center gap-2 border-b border-border px-3">
            <button
              type="button"
              onClick={() =>
                startTransition(() => void handleCreateNote(fallbackClassId))
              }
              disabled={isPending}
              className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-foreground hover:bg-surface disabled:opacity-60"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">New page</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
            {recentNotes.length > 0 ? (
              <section className="mb-5">
                <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                  Recents
                </div>
                <div className="space-y-0.5">
                  {recentNotes.map((note) =>
                    renderNoteItem(note, { compact: true }),
                  )}
                </div>
              </section>
            ) : null}

            <section className="space-y-1">
              <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                Private
              </div>
              {groupedNotes.map((group) => {
                const isCollapsed = collapsedGroups.has(group.id);
                return (
                  <div key={group.id}>
                    <div className="group flex items-center gap-1 rounded-md text-muted-foreground hover:bg-surface hover:text-foreground">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${group.title}`}
                      >
                        {isCollapsed ? (
                          <ChevronRight
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronDown
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm font-medium"
                      >
                        <Folder
                          className="h-4 w-4 shrink-0 opacity-70"
                          aria-hidden="true"
                        />
                        <span className="truncate">{group.title}</span>
                        <span className="ml-auto pr-1 text-[11px] text-muted-foreground">
                          {group.notes.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(
                            () => void handleCreateNote(group.classId),
                          )
                        }
                        disabled={isPending}
                        className="mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 hover:bg-surface-elevated group-hover:opacity-100 disabled:opacity-40"
                        aria-label={`New note in ${group.title}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    {!isCollapsed && group.notes.length > 0 ? (
                      <div className="ml-5 space-y-0.5 border-l border-border/70 pl-1.5">
                        {group.notes.map((note) => renderNoteItem(note))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          </div>
        </aside>

        <section className="h-full min-h-0 bg-background">
          {selectedNote ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4">
                <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate text-foreground">
                    {getRenderableTitle(draftTitle)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="pr-1">
                    {status ? (
                      <span className="hidden text-xs text-muted-foreground md:inline">
                        {status}
                      </span>
                    ) : null}
                    {error ? (
                      <span className="hidden text-xs text-danger md:inline">
                        {error}
                      </span>
                    ) : null}
                  </div>

                  <Select
                    aria-label="Select class"
                    value={selectedNote.classId ?? ""}
                    onChange={(event) => {
                      const nextClassId = event.currentTarget.value || null;
                      setNotes((current) =>
                        current.map((note) =>
                          note.id === selectedNote.id
                            ? { ...note, classId: nextClassId }
                            : note,
                        ),
                      );
                      startTransition(
                        () =>
                          void saveNote(selectedNote.id, {
                            classId: nextClassId,
                          }),
                      );
                    }}
                    className="h-8 w-36 border-transparent bg-transparent px-2 py-1 text-xs text-muted-foreground shadow-none hover:bg-surface-muted focus:border-border focus-visible:ring-0 md:w-44"
                  >
                    <option value="">No class</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getClassLabel(item)}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground disabled:opacity-60"
                    aria-label="Import file"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(() => void handleDeleteNote())
                    }
                    disabled={isPending}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pt-0">
                <NoteSurface
                  initialDocument={selectedNote.content.document}
                  keepEditingWhenEmpty
                  selectionPrelude={
                    <div className="mx-auto w-full px-4 pt-7 md:px-10 md:pt-10">
                      <input
                        data-note-selection-region
                        value={draftTitle}
                        onChange={(event) => {
                          const nextTitle = event.currentTarget.value;
                          setTitleDraftState({
                            noteId: selectedNote.id,
                            value: nextTitle,
                          });
                          setNotes((current) =>
                            current.map((note) =>
                              note.id === selectedNote.id
                                ? { ...note, title: nextTitle }
                                : note,
                            ),
                          );
                        }}
                        onBlur={() => void handleTitleCommit()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                        }}
                        className="w-full border-none bg-transparent p-0 text-4xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
                        placeholder="Untitled"
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatTimestamp(selectedNote.updatedAt)}</span>
                        {selectedNote.fileName ? (
                          <span className="truncate">
                            {selectedNote.fileName}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  }
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
            </div>
          ) : (
            <div className="flex h-full min-h-0 items-center justify-center p-6">
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    startTransition(
                      () => void handleCreateNote(fallbackClassId),
                    )
                  }
                  disabled={isPending}
                >
                  New page
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                >
                  Import
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
