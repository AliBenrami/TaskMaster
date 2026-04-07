"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type EditorJS from "@editorjs/editorjs";
import type { BlockToolConstructable } from "@editorjs/editorjs";
import type { NoteDocument, NoteImageFileData } from "@/lib/notes/types";
import { emptyNoteDocument, NoteDocumentSchema } from "@/lib/notes/types";
import { CodeBlockTool } from "@/components/note-editor/code-block-tool";
import { MathBlockTool } from "@/components/note-editor/math-block-tool";

export type NoteEditorProps = {
  initialDocument: NoteDocument;
  onDocumentChange?: (document: NoteDocument) => void;
  onSave?: (document: NoteDocument) => Promise<void>;
  uploadImage?: (file: File) => Promise<NoteImageFileData>;
  readOnly?: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;

async function uploadImageToDataUrl(file: File): Promise<NoteImageFileData> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image uploads are supported.");
  }

  if (file.size > MAX_INLINE_IMAGE_BYTES) {
    throw new Error("Images larger than 2 MB are not supported by the temporary inline uploader.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not convert image to a data URL."));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Could not read the image file."));
    };

    reader.readAsDataURL(file);
  });

  return {
    url: dataUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

export function NoteEditor({
  initialDocument,
  onDocumentChange,
  onSave,
  uploadImage,
  readOnly = false,
}: NoteEditorProps) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const latestDocumentRef = useRef<NoteDocument>(initialDocument);
  const changeTimeoutRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const emitDocumentChange = useEffectEvent(async () => {
    if (!editorRef.current) {
      return;
    }

    const saved = await editorRef.current.save();
    const document = NoteDocumentSchema.parse(saved);
    latestDocumentRef.current = document;
    onDocumentChange?.(document);
  });

  const resolveImageUpload = useEffectEvent(async (file: File) => {
    const resolvedFile = uploadImage
      ? await uploadImage(file)
      : await uploadImageToDataUrl(file);

    return {
      success: 1 as const,
      file: resolvedFile,
    };
  });

  const handleSaveClick = async () => {
    if (!editorRef.current) {
      return;
    }

    setSaveState("saving");
    setSaveMessage(null);

    try {
      const saved = await editorRef.current.save();
      const document = NoteDocumentSchema.parse(saved);

      latestDocumentRef.current = document;
      onDocumentChange?.(document);

      if (onSave) {
        await onSave(document);
      }

      setSaveState("saved");
      setSaveMessage(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "Failed to save note");
    }
  };

  useEffect(() => {
    let disposed = false;

    async function initEditor() {
      if (!holderRef.current) {
        return;
      }

      const [
        { default: EditorJSClass },
        { default: Paragraph },
        { default: Header },
        { default: EditorjsList },
        { default: Quote },
        { default: ImageTool },
      ] = await Promise.all([
        import("@editorjs/editorjs"),
        import("@editorjs/paragraph"),
        import("@editorjs/header"),
        import("@editorjs/list"),
        import("@editorjs/quote"),
        import("@editorjs/image"),
        import("mathlive"),
      ]);

      if (disposed || !holderRef.current) {
        return;
      }

      const paragraphTool = Paragraph as unknown as BlockToolConstructable;
      const headerTool = Header as unknown as BlockToolConstructable;
      const listTool = EditorjsList as unknown as BlockToolConstructable;
      const quoteTool = Quote as unknown as BlockToolConstructable;
      const imageTool = ImageTool as unknown as BlockToolConstructable;

      const editor = new EditorJSClass({
        holder: holderRef.current,
        autofocus: !readOnly,
        readOnly,
        minHeight: 0,
        data: initialDocument.blocks.length > 0 ? initialDocument : { ...emptyNoteDocument },
        tools: {
          paragraph: {
            class: paragraphTool,
            inlineToolbar: true,
          },
          header: {
            class: headerTool,
            inlineToolbar: true,
            config: {
              levels: [1, 2, 3, 4],
              defaultLevel: 2,
            },
          },
          list: {
            class: listTool,
            inlineToolbar: true,
            config: {
              defaultStyle: "unordered",
            },
          },
          quote: {
            class: quoteTool,
            inlineToolbar: true,
          },
          code: {
            class: CodeBlockTool as unknown as BlockToolConstructable,
          },
          image: {
            class: imageTool,
            config: {
              features: {
                border: false,
                background: false,
                caption: "optional",
                stretch: true,
              },
              uploader: {
                uploadByFile: async (file: Blob) => {
                  if (!(file instanceof File)) {
                    throw new Error("Only file uploads are supported.");
                  }

                  return resolveImageUpload(file);
                },
              },
            },
          },
          math: {
            class: MathBlockTool as unknown as BlockToolConstructable,
          },
        },
        async onChange() {
          if (changeTimeoutRef.current) {
            window.clearTimeout(changeTimeoutRef.current);
          }

          changeTimeoutRef.current = window.setTimeout(() => {
            void emitDocumentChange();
          }, 180);
        },
      });

      editorRef.current = editor;

      try {
        await editor.isReady;

        if (!disposed) {
          setIsReady(true);
        }
      } catch (error) {
        if (!disposed) {
          setSaveState("error");
          setSaveMessage(error instanceof Error ? error.message : "Failed to initialize the editor");
        }
      }
    }

    void initEditor();

    return () => {
      disposed = true;
      setIsReady(false);

      if (changeTimeoutRef.current) {
        window.clearTimeout(changeTimeoutRef.current);
      }

      const editor = editorRef.current;
      editorRef.current = null;

      if (editor) {
        void editor.isReady
          .then(() => editor.destroy())
          .catch(() => undefined);
      }
    };
  }, [initialDocument, readOnly]);

  return (
    <section className="note-editor rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {!readOnly ? (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
          <div className="text-zinc-500">
            Block editor with rich text, images, and MathLive equation blocks.
          </div>
          <div className="flex items-center gap-3">
            {saveMessage ? <span className="text-xs text-zinc-500">{saveMessage}</span> : null}
            <button
              type="button"
              onClick={() => void handleSaveClick()}
              disabled={!isReady || saveState === "saving"}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700"
            >
              {saveState === "saving" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : null}
      <div ref={holderRef} className="px-4 py-4" />
    </section>
  );
}
