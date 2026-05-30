"use client";

import { isValidElement } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeBlockView } from "@/components/note-editor/code-block-view";

function omitNode<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const { node, ...rest } = props;
  void node;
  return rest;
}

function getTextContent(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(getTextContent).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(value)) {
    return getTextContent(value.props.children);
  }

  if (value && typeof value === "object") {
    const candidate = value as {
      children?: unknown;
      props?: { children?: ReactNode };
      value?: unknown;
    };

    if (candidate.props?.children) {
      return getTextContent(candidate.props.children);
    }

    if (typeof candidate.value === "string" || typeof candidate.value === "number") {
      return String(candidate.value);
    }

    if (candidate.children) {
      return getNodeText(candidate.children);
    }
  }

  return "";
}

function getNodeText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(getNodeText).join("");
  }

  if (value && typeof value === "object") {
    const candidate = value as { value?: unknown; children?: unknown };
    if (typeof candidate.value === "string" || typeof candidate.value === "number") {
      return String(candidate.value);
    }

    return getNodeText(candidate.children);
  }

  return "";
}

function extractCode(children: ReactNode) {
  return getTextContent(children).replace(/\n$/, "");
}

function cleanMarkdownText(value: string) {
  return value === "[object Object]" ? "" : value;
}

export function NoteRenderer({ markdown }: { markdown: string }) {
  if (markdown.trim().length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700">
        No note content yet.
      </div>
    );
  }

  return (
    <article className="note-renderer space-y-3">
      <ReactMarkdown
        rehypePlugins={[rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          img: (props) => {
            const { alt, src } = omitNode(props);
            if (!src) {
              return null;
            }

            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={alt ?? "Embedded note image"}
                className="max-h-[32rem] w-full rounded-lg object-contain"
                src={src}
              />
            );
          },
          pre: (props) => {
            const { children, node } = props;
            const code = cleanMarkdownText(extractCode(children)) || cleanMarkdownText(getTextContent(node as ReactNode));
            return <CodeBlockView data={{ code }} />;
          },
          code: (props) => {
            const { children, className, node, ...rest } = props;
            const codeText =
              cleanMarkdownText(getTextContent(children)) ||
              cleanMarkdownText(getTextContent(node as ReactNode));
            if (className) {
              return (
                <code className={className} {...rest}>
                  {codeText}
                </code>
              );
            }

            return (
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-[0.9em] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                {codeText}
              </code>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
