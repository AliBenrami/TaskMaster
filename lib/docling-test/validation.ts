import path from "node:path";
import type { DoclingDocumentMode, DoclingInputFormat } from "./contracts";
import { DoclingTestError } from "./errors";
import { validateDoclingModeAgainstFormat } from "./mode";

const MIME_TO_FORMAT: Record<string, DoclingInputFormat> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const EXT_TO_FORMAT: Record<string, DoclingInputFormat> = {
  ".pdf": "pdf",
  ".docx": "docx",
};

export function inferDoclingInputFormat(fileName: string, mimeType: string) {
  const mimeFormat = MIME_TO_FORMAT[mimeType.toLowerCase()];
  if (mimeFormat) {
    return mimeFormat;
  }

  const extension = path.extname(fileName).toLowerCase();
  const extFormat = EXT_TO_FORMAT[extension];
  if (extFormat) {
    return extFormat;
  }

  throw new DoclingTestError("docling-test currently supports only PDF and DOCX uploads.", 400);
}

export function validateDoclingUploadMode(mode: DoclingDocumentMode, inputFormat: DoclingInputFormat) {
  validateDoclingModeAgainstFormat(mode, inputFormat);
}
