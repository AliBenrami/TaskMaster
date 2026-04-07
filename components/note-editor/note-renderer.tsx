"use client";

import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import type {
  NoteBlock,
  NoteCodeBlockData,
  NoteDocument,
  NoteHeaderBlockData,
  NoteImageBlockData,
  NoteListBlockData,
  NoteListItem,
  NoteQuoteBlockData,
} from "@/lib/notes/types";
import { CodeBlockView } from "@/components/note-editor/code-block-view";

const orderedListStyles: Record<string, CSSProperties["listStyleType"]> = {
  numeric: "decimal",
  "lower-roman": "lower-roman",
  "upper-roman": "upper-roman",
  "lower-alpha": "lower-alpha",
  "upper-alpha": "upper-alpha",
};

function RichText({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />;
}

function renderListItems(items: NoteListItem[], style: NoteListBlockData["style"]): ReactNode {
  return items.map((item, index) => (
    <li key={`${index}-${item.content.slice(0, 12)}`} className="space-y-2">
      {style === "checklist" ? (
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={Boolean(item.meta?.checked)}
            disabled
            className="mt-1"
            readOnly
          />
          <span className="min-w-0">
            <RichText html={item.content} />
          </span>
        </label>
      ) : (
        <RichText html={item.content} />
      )}
      {item.items.length > 0 ? (
        <ul className="ml-6 list-disc space-y-2">{renderListItems(item.items, style)}</ul>
      ) : null}
    </li>
  ));
}

function NoteImage({ data }: { data: NoteImageBlockData }) {
  return (
    <figure className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.file.url}
        alt={data.caption.replace(/<[^>]*>/g, "").trim() || "Embedded note image"}
        className="max-h-[32rem] w-full rounded-lg object-contain"
      />
      {data.caption ? (
        <figcaption className="text-sm text-zinc-500">
          <RichText html={data.caption} />
        </figcaption>
      ) : null}
    </figure>
  );
}

function NoteQuote({ data }: { data: NoteQuoteBlockData }) {
  return (
    <figure className="rounded-lg border-l-4 border-zinc-300 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
      <blockquote
        className={data.alignment === "center" ? "text-center" : undefined}
      >
        <RichText html={data.text} />
      </blockquote>
      {data.caption ? (
        <figcaption className="mt-3 text-sm text-zinc-500">
          <RichText html={data.caption} />
        </figcaption>
      ) : null}
    </figure>
  );
}

function renderBlock(block: NoteBlock) {
  const blockKey = block.id ?? `${block.type}-${JSON.stringify(block.data).slice(0, 48)}`;

  switch (block.type) {
    case "paragraph":
      return (
        <p key={blockKey} className="leading-7 text-zinc-800 dark:text-zinc-200">
          <RichText html={block.data.text} />
        </p>
      );
    case "header": {
      const HeaderTag = `h${block.data.level}` as const;
      const sizeClass =
        block.data.level === 1
          ? "text-3xl"
          : block.data.level === 2
            ? "text-2xl"
            : block.data.level === 3
              ? "text-xl"
              : "text-lg";

      return (
        <HeaderTag
          key={blockKey}
          className={`${sizeClass} font-semibold tracking-tight text-zinc-950 dark:text-zinc-50`}
        >
          <RichText html={(block.data as NoteHeaderBlockData).text} />
        </HeaderTag>
      );
    }
    case "list": {
      const data = block.data as NoteListBlockData;

      if (data.style === "ordered") {
        return (
          <ol
            key={blockKey}
            start={typeof data.meta?.start === "number" ? data.meta.start : undefined}
            className="ml-5 list-outside space-y-2"
            style={{
              listStyleType: data.meta?.counterType
                ? orderedListStyles[data.meta.counterType] ?? "decimal"
                : "decimal",
            }}
          >
            {renderListItems(data.items, data.style)}
          </ol>
        );
      }

      if (data.style === "checklist") {
        return (
          <ul key={blockKey} className="space-y-2">
            {renderListItems(data.items, data.style)}
          </ul>
        );
      }

      return (
        <ul key={blockKey} className="ml-5 list-disc space-y-2">
          {renderListItems(data.items, data.style)}
        </ul>
      );
    }
    case "quote":
      return <NoteQuote key={blockKey} data={block.data as NoteQuoteBlockData} />;
    case "code":
      return <CodeBlockView key={blockKey} data={block.data as NoteCodeBlockData} />;
    case "image":
      return <NoteImage key={blockKey} data={block.data as NoteImageBlockData} />;
    case "math":
      return (
        <div key={blockKey} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <math-field
            className="block rounded-md bg-white px-3 py-2 text-lg dark:bg-zinc-900"
            default-mode="math"
            math-virtual-keyboard-policy="manual"
            read-only=""
            suppressHydrationWarning
          >
            {block.data.latex}
          </math-field>
        </div>
      );
    default:
      return null;
  }
}

export function NoteRenderer({ document }: { document: NoteDocument }) {
  useEffect(() => {
    void import("mathlive");
  }, []);

  if (document.blocks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700">
        No note content yet.
      </div>
    );
  }

  return (
    <article className="note-renderer space-y-5">
      {document.blocks.map((block) => renderBlock(block as NoteBlock))}
    </article>
  );
}
