"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
};

function isEditorChromeTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      ".ce-toolbar, .ce-popover, .ce-inline-toolbar, .ce-conversion-toolbar, .ce-toolbox, .ce-settings",
    ),
  );
}

export function NoteSurface({
  initialDocument,
  onContentChange,
  onSave,
  uploadImage,
  readOnly = false,
}: NoteSurfaceProps) {
  const [content, setContent] = useState<NoteContent>(() => createNoteContent(initialDocument));
  const [isEditing, setIsEditing] = useState(false);
  const editorRootRef = useRef<HTMLDivElement | null>(null);

  const renderedMarkdown = useMemo(() => content.markdown, [content.markdown]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isEditorChromeTarget(event.target)) {
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
  }, [isEditing]);

  if (isEditing && !readOnly) {
    return (
      <div ref={editorRootRef} className="note-surface">
        <NoteEditor
          initialDocument={content.document}
          onContentChange={(nextContent) => {
            setContent(nextContent);
            onContentChange?.(nextContent);
          }}
          onSave={async (nextContent) => {
            setContent(nextContent);
            onContentChange?.(nextContent);
            await onSave?.(nextContent);
          }}
          uploadImage={uploadImage}
        />
      </div>
    );
  }

  return (
    <div
      aria-label={readOnly ? undefined : "Open note editor"}
      className="note-surface"
      onClick={() => {
        if (!readOnly) {
          setIsEditing(true);
        }
      }}
      onKeyDown={(event) => {
        if (readOnly) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setIsEditing(true);
        }
      }}
      role={readOnly ? undefined : "button"}
      tabIndex={readOnly ? undefined : 0}
    >
      <div className="note-surface__content">
        <NoteRenderer markdown={renderedMarkdown} />
      </div>
    </div>
  );
}
