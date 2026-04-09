import { getParseTestModel } from "./feature";

export class ParseTestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ParseTestError";
  }
}

export type ParseActivityLogger = (message: string) => void;

export function toPublicParseTestError(error: unknown) {
  if (error instanceof ParseTestError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message;
    const lowered = message.toLowerCase();

    if (lowered.includes("model") && (lowered.includes("not found") || lowered.includes("not supported"))) {
      return new ParseTestError(
        "The configured Gemini model is unavailable. Switch GEMINI_PARSE_MODEL to gemini-2.5-flash-lite.",
        502,
      );
    }

    if (lowered.includes("deprecated")) {
      return new ParseTestError(
        "The configured Gemini model appears to be deprecated. Switch GEMINI_PARSE_MODEL to gemini-2.5-flash-lite.",
        502,
      );
    }

    if (lowered.includes("resource_exhausted") || lowered.includes("quota")) {
      return new ParseTestError(
        `The current Gemini model or API key has no available quota. Use GEMINI_PARSE_MODEL=${
          getParseTestModel() || "gemini-2.5-flash-lite"
        } and verify billing/quota for your Google AI key.`,
        429,
      );
    }

    return new ParseTestError(message, 500);
  }

  return new ParseTestError("An unexpected ParseTest error occurred.", 500);
}
