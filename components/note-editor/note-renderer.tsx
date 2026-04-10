"use client";

import { Children, isValidElement } from "react";
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

function extractCode(children: ReactNode) {
  if (!isValidElement<{ children?: ReactNode }>(children)) {
    return "";
  }

  const codeChildren = children.props.children;

  if (typeof codeChildren === "string") {
    return codeChildren.replace(/\n$/, "");
  }

  if (Array.isArray(codeChildren)) {
    return codeChildren.join("").replace(/\n$/, "");
  }

  return "";
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
            const { children } = omitNode(props);
            return <CodeBlockView data={{ code: extractCode(Children.only(children)) }} />;
          },
          code: (props) => {
            const { children, className, ...rest } = omitNode(props);
            if (className) {
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            }

            return (
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-[0.9em] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                {children}
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
