import type { Chunk, Chunker } from "./types";

export type MarkdownChunkerOptions = {
  maxChars?: number;
  overlap?: number;
  minChars?: number;
};

const DEFAULT_MAX_CHARS = 1200;
const DEFAULT_OVERLAP = 200;
const DEFAULT_MIN_CHARS = 50;

const HEADING_RE = /^(#{1,6})\s+(.+)$/;

type Section = {
  heading: string | null;
  level: number;
  body: string;
};

function splitIntoHeadingSections(markdown: string): Section[] {
  const lines = markdown.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section = { heading: null, level: 0, body: "" };

  for (const rawLine of lines) {
    const match = rawLine.match(HEADING_RE);
    if (match) {
      if (current.heading !== null || current.body.trim().length > 0) {
        sections.push(current);
      }
      current = {
        heading: match[2].trim(),
        level: match[1].length,
        body: "",
      };
      continue;
    }
    current.body += `${rawLine}\n`;
  }

  if (current.heading !== null || current.body.trim().length > 0) {
    sections.push(current);
  }

  return sections;
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function* slidingWindows(
  text: string,
  maxChars: number,
  overlap: number,
): Generator<string> {
  if (text.length <= maxChars) {
    yield text;
    return;
  }

  const stride = Math.max(1, maxChars - overlap);
  for (let start = 0; start < text.length; start += stride) {
    const slice = text.slice(start, start + maxChars);
    if (slice.trim().length === 0) continue;
    yield slice;
    if (start + maxChars >= text.length) break;
  }
}

function packParagraphs(
  paragraphs: string[],
  maxChars: number,
  overlap: number,
): string[] {
  const out: string[] = [];
  let buffer = "";

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed.length > 0) out.push(trimmed);
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      flush();
      for (const window of slidingWindows(paragraph, maxChars, overlap)) {
        out.push(window.trim());
      }
      continue;
    }

    const candidate = buffer.length === 0 ? paragraph : `${buffer}\n\n${paragraph}`;
    if (candidate.length > maxChars) {
      flush();
      buffer = paragraph;
    } else {
      buffer = candidate;
    }
  }

  flush();
  return out;
}

export function markdownChunker(
  options: MarkdownChunkerOptions = {},
): Chunker {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;
  const minChars = options.minChars ?? DEFAULT_MIN_CHARS;

  return {
    chunk(text: string): Chunk[] {
      const trimmed = text.trim();
      if (trimmed.length === 0) return [];

      const sections = splitIntoHeadingSections(trimmed);
      const chunks: Chunk[] = [];

      const sectionsToUse =
        sections.length === 0
          ? [{ heading: null, level: 0, body: trimmed }]
          : sections;

      for (const section of sectionsToUse) {
        const headingPrefix =
          section.heading !== null
            ? `${"#".repeat(Math.max(1, section.level))} ${section.heading}\n\n`
            : "";
        const paragraphs = splitIntoParagraphs(section.body);
        const packed = packParagraphs(paragraphs, maxChars, overlap);

        if (packed.length === 0 && section.heading) {
          chunks.push({
            content: headingPrefix.trim(),
            metadata: section.heading ? { heading: section.heading } : undefined,
          });
          continue;
        }

        for (const piece of packed) {
          const content = `${headingPrefix}${piece}`.trim();
          if (content.length < minChars && content.length < piece.length) continue;
          chunks.push({
            content,
            metadata: section.heading ? { heading: section.heading } : undefined,
          });
        }
      }

      return chunks;
    },
  };
}

export const noopChunker: Chunker = {
  chunk(text: string): Chunk[] {
    const trimmed = text.trim();
    return trimmed.length === 0 ? [] : [{ content: trimmed }];
  },
};
