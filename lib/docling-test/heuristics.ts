import {
  parseTestPayloadSchema,
  type ParseTestPayload,
} from "@/lib/parse-test/contracts";
import { isHighSignalWarning, parseIsoDate } from "@/lib/parse-test/normalize";
import type { DoclingDocumentMode } from "./contracts";
import { DoclingTestError } from "./errors";

const KNOWN_HOMEWORK_TOOLS = [
  "Canvas",
  "Gradescope",
  "Blackboard",
  "WebAssign",
  "Piazza",
  "Moodle",
  "Ed Discussion",
  "Discord",
  "GitHub",
  "Overleaf",
  "Jupyter",
  "ZyBooks",
  "MyLab",
  "Pearson",
  "Packback",
];

function toLines(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    const normalized = normalizeWhitespace(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push(normalized);
    }
  }

  return results;
}

function truncate(value: string, max = 500) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function firstHeading(lines: string[]) {
  const heading = lines.find((line) => line.startsWith("#"));
  if (heading) {
    return heading.replace(/^#+\s*/, "").trim();
  }

  return lines[0] ?? "Untitled academic document";
}

function inferCourseCode(text: string) {
  const match = text.match(/\b([A-Z]{2,6}\s?-?\d{3,4}[A-Z]?)\b/);
  return match ? match[1].replace(/\s+/g, " ").trim() : null;
}

function inferLabeledValue(lines: string[], labels: string[]) {
  for (const line of lines) {
    for (const label of labels) {
      const pattern = new RegExp(`^${label}\\s*[:\\-]\\s*(.+)$`, "i");
      const match = line.match(pattern);
      if (match) {
        return normalizeWhitespace(match[1]);
      }
    }
  }

  return null;
}

function findSection(lines: string[], names: string[]) {
  const lowerNames = names.map((name) => name.toLowerCase());
  const index = lines.findIndex((line) => {
    const lowered = line.toLowerCase().replace(/^#+\s*/, "");
    return lowerNames.some((name) => lowered === name || lowered.startsWith(`${name}:`));
  });

  if (index < 0) {
    return [];
  }

  const section: string[] = [];
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const line = lines[cursor];
    if (line.startsWith("#")) {
      break;
    }
    if (/^(week|unit|module|topic)\b/i.test(line) && section.length > 0) {
      break;
    }
    section.push(line.replace(/^[-*]\s*/, "").trim());
  }

  return section;
}

function inferTerm(lines: string[]) {
  const combined = lines.slice(0, 25).join(" ");
  const match = combined.match(/\b(Spring|Summer|Fall|Winter)\s+(20\d{2})\b/i);
  return match ? `${match[1]} ${match[2]}` : null;
}

function inferYear(term: string | null) {
  const match = term?.match(/\b(20\d{2})\b/);
  return match ? Number.parseInt(match[1], 10) : new Date().getUTCFullYear();
}

function inferContacts(lines: string[]) {
  const contacts: ParseTestPayload["contacts"] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const emailMatch = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

    if (!emailMatch) {
      continue;
    }

    const email = emailMatch[0].toLowerCase();
    const neighborhood = [lines[index - 1], lines[index], lines[index + 1], lines[index + 2]]
      .filter(Boolean)
      .join(" ");
    const role = /\bta\b|teaching assistant/i.test(neighborhood)
      ? "TA"
      : /\bprofessor\b|\bprof\.\b/i.test(neighborhood)
        ? "Professor"
        : "Instructor";

    const beforeEmail = line.slice(0, emailMatch.index ?? 0).replace(/[\-|(]+$/g, "").trim();
    const prevLine = lines[index - 1] ?? "";
    const candidateName = beforeEmail || prevLine.replace(/^#+\s*/, "").trim();
    const name = candidateName
      .replace(/^(Instructor|Professor|Prof\.?|Teaching Assistant|TA)\s*[:\-]?\s*/i, "")
      .replace(/\bemail\b[:\-]?\s*$/i, "")
      .trim();

    contacts.push({
      role,
      name: name || "Unknown contact",
      email,
      officeHours:
        inferLabeledValue([lines[index + 1] ?? "", lines[index + 2] ?? ""], ["office hours"]) ?? null,
      location: inferLabeledValue([lines[index + 1] ?? "", lines[index + 2] ?? ""], ["office", "location"]) ?? null,
      sourceSnippet: truncate(neighborhood, 500),
    });
  }

  return contacts.slice(0, 20);
}

function inferHomeworkTools(markdown: string) {
  const lowered = markdown.toLowerCase();
  return KNOWN_HOMEWORK_TOOLS.filter((tool) => lowered.includes(tool.toLowerCase()));
}

function inferRequiredMaterials(lines: string[]) {
  const section = findSection(lines, [
    "required materials",
    "required textbooks",
    "textbooks",
    "course materials",
  ]);

  return dedupeStrings(section).slice(0, 30);
}

function inferDescription(lines: string[]) {
  const section = findSection(lines, ["course description", "description", "catalog description"]);
  if (section.length > 0) {
    return {
      catalogDescription: truncate(section.join(" "), 4000),
      descriptionSource: "catalog_description" as const,
    };
  }

  const outcomes = findSection(lines, ["learning outcomes", "course objectives", "objectives"]);
  if (outcomes.length > 0) {
    return {
      catalogDescription: truncate(outcomes.join(" "), 4000),
      descriptionSource: "learning_outcomes" as const,
    };
  }

  return {
    catalogDescription: null,
    descriptionSource: "inferred_from_topics" as const,
  };
}

function inferConcepts(lines: string[]) {
  const section = findSection(lines, ["topics", "schedule", "course schedule"]);
  const fromSection = section
    .map((line) => line.replace(/^(week|unit|module|topic)\s*\d*[:\-]?\s*/i, "").trim())
    .filter((line) => line.length > 3);

  const headingConcepts = lines
    .filter((line) => /^(#+\s*)?(week|unit|module|topic)\b/i.test(line))
    .map((line) => line.replace(/^(#+\s*)?(week|unit|module|topic)\s*\d*[:\-]?\s*/i, "").trim())
    .filter((line) => line.length > 3);

  return dedupeStrings([...headingConcepts, ...fromSection]).slice(0, 20);
}

function inferNoteConcepts(lines: string[]) {
  const headingConcepts = lines
    .filter((line) => line.startsWith("#"))
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter((line) => line.length > 3);

  const labeledConcepts = lines
    .filter((line) => /\b(definition|formula|theorem|lemma|algorithm|example|proof)\b\s*[:\-]/i.test(line))
    .map((line) =>
      line
        .replace(/^(?:[-*]\s*)?/i, "")
        .replace(/\b(definition|formula|theorem|lemma|algorithm|example|proof)\b\s*[:\-]\s*/i, "")
        .trim(),
    )
    .filter((line) => line.length > 3);

  return dedupeStrings([...headingConcepts, ...labeledConcepts]).slice(0, 24);
}

function inferGrading(lines: string[]) {
  const rows: ParseTestPayload["gradingBreakdown"] = [];

  for (const line of lines) {
    const match = line.match(/^(.+?)\s+(?:\||-)?\s*(\d{1,3}(?:\.\d+)?)\s*%$/);
    if (!match) {
      continue;
    }

    const label = match[1]
      .replace(/^[-*]\s*/, "")
      .replace(/[:|]$/, "")
      .trim();
    const weight = Number.parseFloat(match[2]);
    if (!label || Number.isNaN(weight) || weight < 0 || weight > 100) {
      continue;
    }

    rows.push({
      label,
      weight,
      sourceSnippet: truncate(line),
    });
  }

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.label.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

const MONTHS = new Map<string, number>([
  ["jan", 0],
  ["january", 0],
  ["feb", 1],
  ["february", 1],
  ["mar", 2],
  ["march", 2],
  ["apr", 3],
  ["april", 3],
  ["may", 4],
  ["jun", 5],
  ["june", 5],
  ["jul", 6],
  ["july", 6],
  ["aug", 7],
  ["august", 7],
  ["sep", 8],
  ["sept", 8],
  ["september", 8],
  ["oct", 9],
  ["october", 9],
  ["nov", 10],
  ["november", 10],
  ["dec", 11],
  ["december", 11],
]);

function inferCategory(line: string) {
  if (/final exam/i.test(line)) return "Final Exam";
  if (/exam|midterm/i.test(line)) return "Exam";
  if (/quiz/i.test(line)) return "Quiz";
  if (/project/i.test(line)) return "Project";
  if (/lab/i.test(line)) return "Lab";
  if (/discussion/i.test(line)) return "Discussion";
  if (/presentation/i.test(line)) return "Presentation";
  if (/holiday|break|cancel/i.test(line)) return "Calendar";
  if (/assignment|homework|problem set/i.test(line)) return "Assignment";
  return "Course Event";
}

function parseDateParts(line: string, fallbackYear: number) {
  const match = line.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:,\s*(20\d{2}))?\b/i,
  );

  if (!match) {
    return null;
  }

  const month = MONTHS.get(match[1].toLowerCase().replace(".", ""));
  if (month == null) {
    return null;
  }

  const year = match[3] ? Number.parseInt(match[3], 10) : fallbackYear;
  const day = Number.parseInt(match[2], 10);
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0));

  return {
    dateText: match[0].replace(/\s+/g, " ").trim(),
    isoDate: Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10),
  };
}

function extractTimeText(line: string) {
  const match = line.match(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b(?:\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b)?/i);
  return match ? match[0] : null;
}

function inferAssignmentsAndEvents(lines: string[], term: string | null) {
  const fallbackYear = inferYear(term);
  const assignments: ParseTestPayload["assignments"] = [];
  const events: ParseTestPayload["events"] = [];

  for (const line of lines) {
    const date = parseDateParts(line, fallbackYear);
    if (!date) {
      continue;
    }

    const title = line
      .replace(date.dateText, "")
      .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b(?:\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b)?/gi, "")
      .replace(/[|:-]+/g, " ")
      .trim() || inferCategory(line);

    const category = inferCategory(line);
    const timeText = extractTimeText(line);
    const snippet = truncate(line);
    const isAssignmentLike = /assignment|homework|project|lab|quiz|exam|midterm|final|paper|discussion/i.test(line);

    events.push({
      title,
      category,
      dateText: date.dateText,
      isoDate: date.isoDate,
      timeText,
      location: null,
      sourceSnippet: snippet,
    });

    if (isAssignmentLike) {
      assignments.push({
        title,
        category,
        dateText: date.dateText,
        isoDate: date.isoDate,
        timeText,
        weight: null,
        sourceSnippet: snippet,
      });
    }
  }

  return {
    assignments: assignments.slice(0, 100),
    events: events.slice(0, 200),
  };
}

function inferSummary(
  mode: DoclingDocumentMode,
  title: string,
  description: string | null,
  concepts: string[],
  requiredMaterials: string[],
) {
  const firstSentence = description
    ? truncate(description, 220)
    : mode === "notes"
      ? `${title} appears to be a set of academic notes parsed through Docling.`
      : mode === "presentation"
        ? `${title} appears to be an academic presentation parsed through Docling.`
        : `${title} appears to be an academic course document parsed through Docling.`;
  const conceptText =
    concepts.length > 0
      ? `Key topics include ${concepts.slice(0, 4).join(", ")}.`
      : mode === "notes"
        ? "The document includes study content that may need manual topic cleanup."
        : mode === "presentation"
          ? "The document includes slide-level academic content and topic structure."
          : "The document includes a course schedule and academic planning details.";
  const materialText =
    requiredMaterials.length > 0
      ? `Required materials and tools were extracted for downstream study planning.`
      : mode === "notes"
        ? "Supporting materials may need manual review."
        : "Some required materials may need manual review.";

  return truncate(`${firstSentence} ${conceptText} ${materialText}`, 1000);
}

function compactWarnings(warnings: string[]) {
  return dedupeStrings(warnings).filter(isHighSignalWarning).slice(0, 20);
}

function ensurePayload(payload: ParseTestPayload) {
  const parsed = parseTestPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new DoclingTestError(
      `Docling heuristics produced invalid normalized output: ${parsed.error.issues
        .map((issue) => issue.path.join(".") || "root")
        .join(", ")}`,
      500,
    );
  }

  return parsed.data;
}

export function buildNormalizedCandidateFromMarkdown(
  markdown: string,
  mode: DoclingDocumentMode,
  baseWarnings: string[] = [],
): ParseTestPayload {
  const lines = toLines(markdown);
  const title = truncate(firstHeading(lines), 200);
  const term = inferTerm(lines);
  const description = inferDescription(lines);
  const concepts = mode === "notes" ? inferNoteConcepts(lines) : inferConcepts(lines);
  const requiredMaterials = inferRequiredMaterials(lines);
  const homeworkTools = inferHomeworkTools(markdown);
  const contacts = inferContacts(lines);
  const gradingBreakdown = inferGrading(lines);
  const { assignments, events } = inferAssignmentsAndEvents(lines, term);

  const warnings = [...baseWarnings];
  if (mode === "syllabus" && contacts.length === 0) {
    warnings.push("Docling did not identify any instructor or TA contact lines.");
  }
  if (mode === "syllabus" && events.length === 0) {
    warnings.push("Docling did not identify any explicit calendar-dated course events.");
  }
  if (mode !== "presentation" && requiredMaterials.length === 0) {
    warnings.push("Docling did not confidently identify required materials.");
  }
  if (concepts.length === 0) {
    warnings.push(
      mode === "notes"
        ? "Docling did not confidently identify note headings, formulas, or definitions for key concepts."
        : mode === "presentation"
          ? "Docling did not confidently identify slide topics for key concepts."
          : "Docling did not confidently identify topic headings for key concepts.",
    );
  }
  if (mode !== "syllabus" && events.length === 0) {
    warnings.push("Docling did not identify any explicit calendar-dated references in this document.");
  }

  const payload: ParseTestPayload = {
    courseTitle:
      title ||
      (mode === "notes"
        ? "Untitled academic notes"
        : mode === "presentation"
          ? "Untitled academic presentation"
          : "Untitled syllabus"),
    courseCode: inferCourseCode(title),
    courseSection: inferLabeledValue(lines, ["section", "course section"]),
    term,
    instructorName: inferLabeledValue(lines, ["instructor", "professor", "prof", "faculty"]),
    meetingDays: inferLabeledValue(lines, ["meeting days", "days"]),
    meetingTime: inferLabeledValue(lines, ["meeting time", "time"]),
    meetingLocation: inferLabeledValue(lines, ["meeting location", "location", "room"]),
    requiredMaterials,
    homeworkTools,
    catalogDescription: description.catalogDescription,
    studentSummary: inferSummary(mode, title, description.catalogDescription, concepts, requiredMaterials),
    descriptionSource: description.descriptionSource,
    keyConcepts: concepts,
    contacts,
    gradingBreakdown,
    assignments,
    events,
    warnings: compactWarnings(warnings),
  };

  return ensurePayload(payload);
}

function recursiveCount(rawJson: unknown, pattern: RegExp): number {
  if (typeof rawJson === "string") {
    return pattern.test(rawJson) ? 1 : 0;
  }

  if (Array.isArray(rawJson)) {
    return rawJson.reduce((sum, item) => sum + recursiveCount(item, pattern), 0);
  }

  if (rawJson && typeof rawJson === "object") {
    return Object.entries(rawJson).reduce((sum, [key, value]) => {
      const current = pattern.test(key) ? 1 : 0;
      return sum + current + recursiveCount(value, pattern);
    }, 0);
  }

  return 0;
}

export function summarizeDoclingArtifact(rawJson: unknown) {
  let pageCount: number | null = null;

  if (rawJson && typeof rawJson === "object" && "pages" in rawJson && Array.isArray((rawJson as { pages?: unknown[] }).pages)) {
    pageCount = (rawJson as { pages: unknown[] }).pages.length;
  }

  return {
    pageCount,
    tableCount: recursiveCount(rawJson, /table/i) || null,
    pictureCount: recursiveCount(rawJson, /picture|image/i) || null,
    codeBlockCount: recursiveCount(rawJson, /code/i) || null,
    headingCount: recursiveCount(rawJson, /heading|header/i) || null,
    formulaCount: recursiveCount(rawJson, /formula|equation/i) || null,
  };
}

export function compareCounts(doclingCount: number, parseTestCount: number) {
  return doclingCount - parseTestCount;
}

export function toIsoStringOrNull(value: string | null) {
  const parsed = parseIsoDate(value);
  return parsed ? parsed.toISOString() : null;
}
