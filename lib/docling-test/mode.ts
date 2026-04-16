import {
  doclingDocumentModeValues,
  type DoclingDocumentMode,
  type DoclingInputFormat,
} from "./contracts";
import { DoclingTestError } from "./errors";

const MODE_LABELS: Record<DoclingDocumentMode, string> = {
  syllabus: "Syllabus",
  notes: "Notes",
  presentation: "Presentation",
};

const MODE_PLURAL_LABELS: Record<DoclingDocumentMode, string> = {
  syllabus: "Syllabuses",
  notes: "Notes",
  presentation: "Presentations",
};

const MODE_ROUTE_TITLES: Record<DoclingDocumentMode, string> = {
  syllabus: "Structured course and schedule extraction for syllabuses",
  notes: "Technical note parsing and topic inspection for study notes",
  presentation: "Slide deck parsing and academic content extraction for presentations",
};

export function isDoclingDocumentMode(value: string): value is DoclingDocumentMode {
  return (doclingDocumentModeValues as readonly string[]).includes(value);
}

export function parseDoclingDocumentMode(value: string | null | undefined): DoclingDocumentMode {
  if (!value) {
    return "syllabus";
  }

  return isDoclingDocumentMode(value) ? value : "syllabus";
}

export function getDoclingModeLabel(mode: DoclingDocumentMode) {
  return MODE_LABELS[mode];
}

export function getDoclingModePluralLabel(mode: DoclingDocumentMode) {
  return MODE_PLURAL_LABELS[mode];
}

export function getDoclingModeRouteTitle(mode: DoclingDocumentMode) {
  return MODE_ROUTE_TITLES[mode];
}

export function getDoclingModeUploadLabel(mode: DoclingDocumentMode) {
  switch (mode) {
    case "notes":
      return "Upload one note file and inspect the Docling output";
    case "presentation":
      return "Upload one presentation PDF and inspect the Docling output";
    default:
      return "Upload one syllabus file and inspect the Docling output";
  }
}

export function getDoclingModeDescription(mode: DoclingDocumentMode) {
  switch (mode) {
    case "notes":
      return "Upload a PDF or DOCX of study notes, run the Docling-backed parsing pipeline, save the normalized output to SQL, and inspect the raw markdown plus JSON artifacts from the same saved run.";
    case "presentation":
      return "Upload a presentation PDF, run the Docling-backed parsing pipeline, save the normalized output to SQL, and inspect the raw markdown plus JSON artifacts from the same saved run.";
    default:
      return "Upload a syllabus PDF or DOCX, run the Docling-backed parsing pipeline, save the normalized output to SQL, and inspect the raw markdown plus JSON artifacts from the same saved run.";
  }
}

export function getDoclingModeAcceptedFormats(mode: DoclingDocumentMode) {
  return mode === "presentation" ? "PDF only" : "PDF or DOCX";
}

export function validateDoclingModeAgainstFormat(
  mode: DoclingDocumentMode,
  inputFormat: DoclingInputFormat,
) {
  if (mode === "presentation" && inputFormat !== "pdf") {
    throw new DoclingTestError("Presentation mode currently accepts PDF uploads only.", 400);
  }
}
