"use client";

import { Children, isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeBlockView } from "@/components/note-editor/code-block-view";

function mergeClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

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

function Paragraph({
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"p">, "children"> & {
  children?: ReactNode;
  node?: unknown;
}) {
  return (
    <p
      className={mergeClasses("leading-7 text-zinc-800 dark:text-zinc-200", className)}
      {...omitNode(props)}
    />
  );
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
    <article className="note-renderer space-y-5">
      <ReactMarkdown
        rehypePlugins={[rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          h1: (props) => {
            const { className, ...rest } = omitNode(props);
            return (
              <h1
                className={mergeClasses(
                  "text-4xl font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50",
                  className,
                )}
                {...rest}
              />
            );
          },
          h2: (props) => {
            const { className, ...rest } = omitNode(props);
            return (
              <h2
                className={mergeClasses(
                  "text-3xl font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50",
                  className,
                )}
                {...rest}
              />
            );
          },
          h3: (props) => {
            const { className, ...rest } = omitNode(props);
            return (
              <h3
                className={mergeClasses(
                  "text-2xl font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50",
                  className,
                )}
                {...rest}
              />
            );
          },
          h4: (props) => {
            const { className, ...rest } = omitNode(props);
            return (
              <h4
                className={mergeClasses(
                  "text-xl font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50",
                  className,
                )}
                {...rest}
              />
            );
          },
          p: Paragraph,
          ul: (props) => {
            const { className, ...rest } = omitNode(props);
            return <ul className={mergeClasses("ml-5 list-disc space-y-2", className)} {...rest} />;
          },
          ol: (props) => {
            const { className, ...rest } = omitNode(props);
            return (
              <ol
                className={mergeClasses("ml-5 list-outside list-decimal space-y-2", className)}
                {...rest}
              />
            );
          },
          li: (props) => {
            const { children, className, ...rest } = omitNode(props);
            return (
              <li className={mergeClasses("space-y-2 marker:text-zinc-500", className)} {...rest}>
                {children}
              </li>
            );
          },
          blockquote: (props) => {
            const { className, ...rest } = omitNode(props);
            return (
              <blockquote
                className={mergeClasses(
                  "rounded-lg border-l-4 border-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
                  className,
                )}
                {...rest}
              />
            );
          },
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
