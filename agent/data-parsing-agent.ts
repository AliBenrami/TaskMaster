import { google } from "@ai-sdk/google";
import { InferAgentUIMessage, ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";

const parseJsonTool = tool({
  description:
    "Parse a JSON string and return it as structured data with validation errors if invalid.",
  inputSchema: z.object({
    json: z.string().describe("Raw JSON string to parse"),
  }),
  execute: async ({ json }) => {
    try {
      return {
        ok: true,
        data: JSON.parse(json),
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to parse JSON input.",
      };
    }
  },
});

const parseCsvTool = tool({
  description:
    "Parse CSV-like text into structured rows. Best for simple CSV without quoted commas.",
  inputSchema: z.object({
    csv: z.string().describe("CSV text to parse"),
    delimiter: z
      .enum([",", ";", "\t", "|"])
      .default(",")
      .describe("Column delimiter"),
    hasHeaders: z
      .boolean()
      .default(true)
      .describe("Whether first row should be treated as headers"),
  }),
  execute: async ({ csv, delimiter, hasHeaders }) => {
    const rows = csv
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => row.split(delimiter).map((cell) => cell.trim()));

    if (rows.length === 0) {
      return {
        ok: false,
        error: "No rows found.",
      };
    }

    if (!hasHeaders) {
      return {
        ok: true,
        rowCount: rows.length,
        rows,
      };
    }

    const [headers, ...values] = rows;
    const normalizedHeaders = headers.map(
      (header, index) => header || `column_${index + 1}`,
    );

    const records = values.map((row) =>
      Object.fromEntries(
        normalizedHeaders.map((header, index) => [header, row[index] ?? ""]),
      ),
    );

    return {
      ok: true,
      rowCount: records.length,
      headers: normalizedHeaders,
      records,
    };
  },
});

const parseKeyValueTool = tool({
  description:
    "Parse key-value text blocks (e.g. 'name: Alice') into an object. One pair per line.",
  inputSchema: z.object({
    text: z.string().describe("Multiline key-value text"),
    pairDelimiter: z
      .string()
      .default(":")
      .describe("Delimiter between key and value"),
  }),
  execute: async ({ text, pairDelimiter }) => {
    const result: Record<string, string> = {};
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const splitIndex = line.indexOf(pairDelimiter);
      if (splitIndex === -1) {
        continue;
      }

      const key = line.slice(0, splitIndex).trim();
      const value = line.slice(splitIndex + pairDelimiter.length).trim();

      if (key.length > 0) {
        result[key] = value;
      }
    }

    return {
      ok: true,
      keyCount: Object.keys(result).length,
      data: result,
    };
  },
});

export const dataParsingAgent = new ToolLoopAgent({
  model: google("gemini-2.5-flash-lite"),
  instructions: `
You are a data parsing assistant.

Primary responsibilities:
- Parse messy user-provided data into clean structured output.
- Choose deterministic tools when data format is JSON, CSV, or key-value text.
- Explain parse assumptions briefly and clearly.
- If input is ambiguous, ask a focused follow-up question.

Output style:
- Be concise.
- Prefer bullet points for parsed summaries.
- Include a compact JSON block when returning structured data.
`.trim(),
  stopWhen: stepCountIs(6),
  tools: {
    parseJson: parseJsonTool,
    parseCsv: parseCsvTool,
    parseKeyValueText: parseKeyValueTool,
  },
});

export type DataParsingAgentMessage = InferAgentUIMessage<typeof dataParsingAgent>;
