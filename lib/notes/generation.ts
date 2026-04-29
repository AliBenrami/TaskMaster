import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { NoteBlock, NoteDocument } from "@/lib/notes/types";

const AZURE_DOCUMENT_INTELLIGENCE_API_VERSION = "2024-11-30";
const EMBEDDING_DIMENSIONS = 768;

const markdownNoteSchema = z.object({
  markdown: z.string().min(1),
});

const topicSchema = z.object({
  title: z.string().min(1),
  markdown: z.string().min(1),
});

const topicsSchema = z.object({
  topics: z.array(topicSchema).min(1),
});

export type GeneratedTopicNote = {
  title: string;
  markdown: string;
  embedding: number[];
};

function getRequiredEnv(name: string, fallbackName?: string) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);

  if (!value) {
    throw new Error(
      fallbackName
        ? `${name} is missing. Add ${name} to your server environment.`
        : `${name} is missing. Add it to your server environment.`,
    );
  }

  return value;
}

function getGoogleAiClient() {
  return new GoogleGenAI({
    apiKey: getRequiredEnv("GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"),
  });
}

function parseJsonPayload(value: string) {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fencedMatch?.[1] ?? trimmed) as unknown;
}

function normalizeAzureEndpoint(value: string) {
  return value.replace(/\/+$/, "");
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeDocumentWithAzure(fileBuffer: Buffer, mimeType: string) {
  const endpoint = normalizeAzureEndpoint(getRequiredEnv("AZURE_ENDPOINT", "AZURE_ENDPOINT"));
  const key = getRequiredEnv("AZURE_KEY");
  const model = encodeURIComponent(getRequiredEnv("AZURE_MODEL"));
  const analyzeUrl = `${endpoint}/documentintelligence/documentModels/${model}:analyze?_overload=analyzeDocument&api-version=${AZURE_DOCUMENT_INTELLIGENCE_API_VERSION}`;

  const analyzeResponse = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": key,
    },
    body: JSON.stringify({
      base64Source: fileBuffer.toString("base64"),
    }),
  });

  if (!analyzeResponse.ok) {
    const details = await analyzeResponse.text().catch(() => "");
    throw new Error(`Azure Document Intelligence rejected the file (${analyzeResponse.status}). ${details}`);
  }

  const operationLocation = analyzeResponse.headers.get("operation-location");
  if (!operationLocation) {
    throw new Error("Azure Document Intelligence did not return an operation-location header.");
  }

  const retryAfter = Number(analyzeResponse.headers.get("retry-after") ?? 1);
  const pollDelayMs = Number.isFinite(retryAfter) ? Math.max(1000, retryAfter * 1000) : 1000;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await wait(pollDelayMs);

    const pollResponse = await fetch(operationLocation, {
      headers: {
        "Ocp-Apim-Subscription-Key": key,
      },
    });

    if (!pollResponse.ok) {
      const details = await pollResponse.text().catch(() => "");
      throw new Error(`Azure Document Intelligence polling failed (${pollResponse.status}). ${details}`);
    }

    const payload = (await pollResponse.json()) as {
      status?: string;
      analyzeResult?: {
        content?: string;
      };
      error?: {
        message?: string;
      };
    };

    if (payload.status === "succeeded") {
      const parsedText = payload.analyzeResult?.content?.trim();
      if (!parsedText) {
        throw new Error(`Azure Document Intelligence parsed ${mimeType} but returned no text content.`);
      }

      return parsedText;
    }

    if (payload.status === "failed") {
      throw new Error(payload.error?.message || "Azure Document Intelligence failed to analyze the file.");
    }
  }

  throw new Error("Azure Document Intelligence timed out before returning parsed text.");
}

export async function rewriteParsedTextAsMarkdown(parsedText: string, fileName: string) {
  const ai = getGoogleAiClient();
  const response = await ai.models.generateContent({
    model: getRequiredEnv("GEMINI_PARSE_MODEL"),
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "Rewrite the parsed document text into clean Markdown notes.",
              "Do not add new facts, examples, interpretations, dates, names, conclusions, or context.",
              "Only reorganize, format, and lightly rewrite information that is present in the source text.",
              "Preserve uncertainty and omissions. If the source is unclear, keep it unclear.",
              "Convert all parsed math section into LaTeX math blocks. Do not attempt to interpret or rewrite math expressions.",
              "Convert all parsed tables into Markdown tables. Do not attempt to interpret or rewrite table contents.",
              "Convert all parsed lists into Markdown lists. Do not attempt to interpret or rewrite list contents.",
              "Convert all parsed images into Markdown image links with alt text. Do not attempt to interpret or rewrite image contents.",
              "Convert all code sections into Markdown code blocks. Do not attempt to interpret or rewrite code contents.",
              "Return JSON only with this shape: {\"markdown\":\"...\"}.",
              `File name: ${fileName}`,
              "Parsed text:",
              parsedText,
            ].join("\n\n"),
          },
        ],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          markdown: { type: "string" },
        },
        required: ["markdown"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty Markdown rewrite.");
  }

  return markdownNoteSchema.parse(parseJsonPayload(response.text)).markdown.trim();
}

export async function splitMarkdownIntoTopics(markdown: string) {
  const ai = getGoogleAiClient();
  const response = await ai.models.generateContent({
    model: getRequiredEnv("GEMINI_PARSE_MODEL"),
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "Split these Markdown notes into large topic sections.",
              "Each topic must contain only text copied or rewritten from the supplied Markdown notes.",
              "Do not introduce new facts. Do not summarize across missing context.",
              "A topic may be the entire note if the note covers one topic.",
              "Return JSON only with this shape: {\"topics\":[{\"title\":\"...\",\"markdown\":\"...\"}]}",
              "Markdown notes:",
              markdown,
            ].join("\n\n"),
          },
        ],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          topics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                markdown: { type: "string" },
              },
              required: ["title", "markdown"],
            },
          },
        },
        required: ["topics"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty topic split.");
  }

  return topicsSchema.parse(parseJsonPayload(response.text)).topics.map((topic) => ({
    title: topic.title.trim() || "Generated Topic",
    markdown: topic.markdown.trim(),
  }));
}

function l2Normalize(values: number[]) {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error("Gemini returned an embedding vector with zero magnitude.");
  }

  return values.map((value) => value / magnitude);
}

export async function embedGeneratedTopics(topics: Array<{ title: string; markdown: string }>) {
  const ai = getGoogleAiClient();
  const response = await ai.models.embedContent({
    model: getRequiredEnv("GEMINI_EMBEDDINGS_MODEL"),
    contents: topics.map((topic) => `${topic.title}\n\n${topic.markdown}`),
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType: "RETRIEVAL_DOCUMENT",
    },
  });

  const embeddings = response.embeddings ?? [];
  if (embeddings.length !== topics.length) {
    throw new Error("Gemini returned an unexpected number of embeddings.");
  }

  return topics.map((topic, index) => {
    const values = embeddings[index]?.values ?? [];
    if (values.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Gemini returned a ${values.length}-dimensional embedding instead of ${EMBEDDING_DIMENSIONS}.`);
    }

    return {
      ...topic,
      embedding: l2Normalize(values),
    };
  });
}

function createBlockId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

function createParagraphBlock(lines: string[]): NoteBlock {
  return {
    id: createBlockId(),
    type: "paragraph",
    data: {
      text: lines.join("<br>"),
    },
  };
}

export function markdownToNoteDocument(markdown: string): NoteDocument {
  const blocks: NoteBlock[] = [];
  const paragraphLines: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push(createParagraphBlock([...paragraphLines]));
    paragraphLines.length = 0;
  }

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      flushParagraph();
      blocks.push({
        id: createBlockId(),
        type: "header",
        data: {
          text: headingMatch[2].trim(),
          level: Math.min(6, headingMatch[1].length) as 1 | 2 | 3 | 4 | 5 | 6,
        },
      });
      continue;
    }

    if (line.trim().length === 0) {
      flushParagraph();
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();

  return {
    time: Date.now(),
    version: "2.31.5",
    blocks,
  };
}

export async function generateTopicNotesFromFile(params: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}) {
  const parsedText = await analyzeDocumentWithAzure(params.fileBuffer, params.mimeType);
  const markdown = await rewriteParsedTextAsMarkdown(parsedText, params.fileName);
  const topics = await splitMarkdownIntoTopics(markdown);
  const embeddedTopics = await embedGeneratedTopics(topics);

  return {
    parsedText,
    markdown,
    topics: embeddedTopics,
  };
}
