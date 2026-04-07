"use client";

import { highlightCode } from "@/lib/notes/code-highlighter";
import type { NoteCodeBlockData } from "@/lib/notes/types";

type CodeBlockViewProps = {
  data: NoteCodeBlockData;
};

export function CodeBlockView({ data }: CodeBlockViewProps) {
  return (
    <pre className="codex-code-block__surface">
      <code
        className="hljs codex-code-block__code"
        dangerouslySetInnerHTML={{
          __html:
            data.code.trim().length > 0
              ? highlightCode(data.code)
              : "<span class=\"codex-code-block__placeholder\">No code yet.</span>",
        }}
      />
    </pre>
  );
}
