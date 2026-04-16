"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import type EditorJS from "@editorjs/editorjs";
import type { BlockToolConstructable } from "@editorjs/editorjs";
import type { NoteContent, NoteDocument, NoteImageFileData } from "@/lib/notes/types";
import { emptyNoteDocument, NoteDocumentSchema } from "@/lib/notes/types";
import { createNoteContent } from "@/lib/notes/markdown";
import { CodeBlockTool } from "@/components/note-editor/code-block-tool";
import { MathBlockTool } from "@/components/note-editor/math-block-tool";

export type NoteEditorProps = {
  initialDocument: NoteDocument;
  onContentChange?: (content: NoteContent) => void;
  onSave?: (content: NoteContent) => Promise<void>;
  uploadImage?: (file: File) => Promise<NoteImageFileData>;
  readOnly?: boolean;
};

const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;

function areDocumentsEqual(left: NoteDocument, right: NoteDocument) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function uploadImageToDataUrl(file: File): Promise<NoteImageFileData> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image uploads are supported.");
  }

  if (file.size > MAX_INLINE_IMAGE_BYTES) {
    throw new Error(
      "Images larger than 2 MB are not supported by the temporary inline uploader.",
    );
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
  onContentChange,
  onSave,
  uploadImage,
  readOnly = false,
}: NoteEditorProps) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const changeTimeoutRef = useRef<number | null>(null);
  const renderedDocumentRef = useRef<NoteDocument>(initialDocument);
  const pendingSaveRef = useRef<NoteContent | null>(null);
  const isFlushingSaveRef = useRef(false);

  const flushPendingSaves = useEffectEvent(async () => {
    if (!onSave || isFlushingSaveRef.current) {
      return;
    }

    isFlushingSaveRef.current = true;

    try {
      while (pendingSaveRef.current) {
        const nextContent = pendingSaveRef.current;
        pendingSaveRef.current = null;
        await onSave(nextContent);
      }
    } finally {
      isFlushingSaveRef.current = false;
    }
  });

  const publishContent = useEffectEvent(async (content: NoteContent) => {
    renderedDocumentRef.current = content.document;
    onContentChange?.(content);

    if (!onSave) {
      return;
    }

    pendingSaveRef.current = content;
    await flushPendingSaves();
  });

  const emitContentChange = useEffectEvent(async () => {
    if (!editorRef.current) {
      return;
    }

    try {
      const saved = await editorRef.current.save();
      const document = NoteDocumentSchema.parse(saved);
      const content = createNoteContent(document);
      await publishContent(content);
    } catch (error) {
      console.error("Failed to persist note changes.", error);
    }
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
        data:
          renderedDocumentRef.current.blocks.length > 0
            ? renderedDocumentRef.current
            : { ...emptyNoteDocument },
        tools: {
          paragraph: {
            class: paragraphTool,
            inlineToolbar: true,
            config: {
              placeholder: "press '/' for commands",
            },
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
            void emitContentChange();
          }, 180);
        },
      });

      editorRef.current = editor;

      try {
        await editor.isReady;
      } catch (error) {
        if (!disposed) {
          console.error("Failed to initialize the editor.", error);
        }
      }
    }

    void initEditor();

    return () => {
      disposed = true;

      if (changeTimeoutRef.current) {
        window.clearTimeout(changeTimeoutRef.current);
        changeTimeoutRef.current = null;

        if (!readOnly) {
          void emitContentChange();
        }
      }

      const editor = editorRef.current;
      editorRef.current = null;

      if (editor) {
        void editor.isReady.then(() => editor.destroy()).catch(() => undefined);
      }
    };
  }, [readOnly]);

  useEffect(() => {
    if (areDocumentsEqual(initialDocument, renderedDocumentRef.current)) {
      return;
    }

    renderedDocumentRef.current = initialDocument;
    pendingSaveRef.current = null;

    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    void editor.isReady
      .then(() =>
        editor.render(
          initialDocument.blocks.length > 0 ? initialDocument : { ...emptyNoteDocument },
        ),
      )
      .catch((error) => {
        console.error("Failed to sync note document.", error);
      });
  }, [initialDocument]);

  return (
    <section className="note-editor relative min-h-[78vh]">
      <div
        ref={holderRef}
        className="mx-auto min-h-[72vh] w-full max-w-4xl px-2 pb-24 pt-8 md:px-8 md:pb-32 md:pt-12"
      />
    </section>
  );
}
