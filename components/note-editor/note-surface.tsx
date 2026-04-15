"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { NoteEditor } from "@/components/note-editor/note-editor";
import { NoteRenderer } from "@/components/note-editor/note-renderer";
import { createNoteContent } from "@/lib/notes/markdown";
import type { NoteContent, NoteDocument, NoteImageFileData } from "@/lib/notes/types";

export type NoteSurfaceProps = {
  initialDocument: NoteDocument;
  onContentChange?: (content: NoteContent) => void;
  onSave?: (content: NoteContent) => Promise<void>;
  uploadImage?: (file: File) => Promise<NoteImageFileData>;
  readOnly?: boolean;
  keepEditingWhenEmpty?: boolean;
};

function isEditorChromeTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        ".ce-toolbar",
        ".ce-popover",
        ".ce-inline-toolbar",
        ".ce-conversion-toolbar",
        ".ce-toolbox",
        ".ce-settings",
        ".ML__keyboard",
        ".MLK__backdrop",
        ".MLK__plate",
        ".MLK__layer",
        ".ML__virtual-keyboard-toggle",
        ".ML__menu-toggle",
        ".ML__tooltip-container",
      ].join(", "),
    ),
  );
}

function isInteractivePreviewTarget(target: EventTarget | null, container: HTMLElement) {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactiveTarget = target.closest(
    "a, button, input, textarea, select, summary, [role='button'], [role='link'], [data-note-surface-ignore-click]",
  );

  return interactiveTarget !== null && interactiveTarget !== container;
}

function areDocumentsEqual(left: NoteDocument, right: NoteDocument) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function NoteSurface({
  initialDocument,
  onContentChange,
  onSave,
  uploadImage,
  readOnly = false,
  keepEditingWhenEmpty = false,
}: NoteSurfaceProps) {
  const [draftState, setDraftState] = useState(() => ({
    sourceDocument: initialDocument,
    content: createNoteContent(initialDocument),
  }));
  const [isEditing, setIsEditing] = useState(
    () =>
      !readOnly &&
      keepEditingWhenEmpty &&
      createNoteContent(initialDocument).markdown.trim().length === 0,
  );
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const content = areDocumentsEqual(draftState.sourceDocument, initialDocument)
    ? draftState.content
    : createNoteContent(initialDocument);
  const renderedMarkdown = useMemo(() => content.markdown, [content.markdown]);
  const shouldKeepEditorOpen =
    !readOnly && keepEditingWhenEmpty && renderedMarkdown.trim().length === 0;
  const isEditorOpen = isEditing || shouldKeepEditorOpen;

  useEffect(() => {
    if (!isEditorOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isEditorChromeTarget(event.target)) {
        return;
      }

      if (shouldKeepEditorOpen) {
        return;
      }

      if (!editorRootRef.current?.contains(event.target as Node)) {
        setIsEditing(false);
      }
    };

    window.document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isEditorOpen, shouldKeepEditorOpen]);

  const openEditor = () => {
    if (!readOnly) {
      setIsEditing(true);
    }
  };

  const updateContent = (nextContent: NoteContent) => {
    setDraftState({
      sourceDocument: initialDocument,
      content: nextContent,
    });
  };

  const handlePreviewClick = (event: MouseEvent<HTMLDivElement>) => {
    if (readOnly || isInteractivePreviewTarget(event.target, event.currentTarget)) {
      return;
    }

    openEditor();
  };

  if (isEditorOpen && !readOnly) {
    return (
      <div ref={editorRootRef} className="note-surface">
        <NoteEditor
          initialDocument={content.document}
          onContentChange={(nextContent) => {
            updateContent(nextContent);
            onContentChange?.(nextContent);
          }}
          onSave={async (nextContent) => {
            updateContent(nextContent);
            await onSave?.(nextContent);
          }}
          uploadImage={uploadImage}
        />
      </div>
    );
  }

  return (
    <div
      aria-label={readOnly || shouldKeepEditorOpen ? undefined : "Open note editor"}
      className="note-surface"
      onClick={handlePreviewClick}
      role={readOnly || shouldKeepEditorOpen ? undefined : "button"}
      tabIndex={readOnly || shouldKeepEditorOpen ? undefined : 0}
    >
      <div className="note-surface__content">
        <NoteRenderer markdown={renderedMarkdown} />
      </div>
    </div>
  );
}
