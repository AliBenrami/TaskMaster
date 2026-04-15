export class DoclingTestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DoclingTestError";
  }
}

export type DoclingActivityLogger = (message: string) => void;

export function toPublicDoclingTestError(error: unknown) {
  if (error instanceof DoclingTestError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message;
    const lowered = message.toLowerCase();

    if (lowered.includes("timed out")) {
      return new DoclingTestError("Docling timed out while parsing the document.", 504);
    }

    if (lowered.includes("no module named") && lowered.includes("docling")) {
      return new DoclingTestError(
        "Docling is not installed for the configured Python runtime. Install `docling` before using docling-test.",
        500,
      );
    }

    if (lowered.includes("unsupported docling backend")) {
      return new DoclingTestError(message, 500);
    }

    return new DoclingTestError(message, 500);
  }

  return new DoclingTestError("An unexpected docling-test error occurred.", 500);
}
