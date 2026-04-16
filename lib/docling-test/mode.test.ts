import { describe, expect, it } from "vitest";
import { parseDoclingDocumentMode, validateDoclingModeAgainstFormat } from "./mode";

describe("parseDoclingDocumentMode", () => {
  it("defaults to syllabus for missing or invalid values", () => {
    expect(parseDoclingDocumentMode(undefined)).toBe("syllabus");
    expect(parseDoclingDocumentMode("mystery")).toBe("syllabus");
  });

  it("accepts supported modes", () => {
    expect(parseDoclingDocumentMode("notes")).toBe("notes");
    expect(parseDoclingDocumentMode("presentation")).toBe("presentation");
  });
});

describe("validateDoclingModeAgainstFormat", () => {
  it("allows PDF uploads in presentation mode", () => {
    expect(() => validateDoclingModeAgainstFormat("presentation", "pdf")).not.toThrow();
  });

  it("rejects DOCX uploads in presentation mode", () => {
    expect(() => validateDoclingModeAgainstFormat("presentation", "docx")).toThrow(
      /Presentation mode currently accepts PDF uploads only/i,
    );
  });
});
