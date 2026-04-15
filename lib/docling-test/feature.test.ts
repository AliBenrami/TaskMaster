import { afterEach, describe, expect, it } from "vitest";
import { getDoclingBackend, getDoclingPythonBin, getDoclingTimeoutMs } from "./feature";

const originalBackend = process.env.DOCLING_BACKEND;
const originalPythonBin = process.env.DOCLING_PYTHON_BIN;
const originalTimeout = process.env.DOCLING_TIMEOUT_MS;

afterEach(() => {
  process.env.DOCLING_BACKEND = originalBackend;
  process.env.DOCLING_PYTHON_BIN = originalPythonBin;
  process.env.DOCLING_TIMEOUT_MS = originalTimeout;
});

describe("docling feature config", () => {
  it("defaults to the local python backend", () => {
    delete process.env.DOCLING_BACKEND;
    expect(getDoclingBackend()).toBe("local-python");
  });

  it("rejects unsupported backends clearly", () => {
    process.env.DOCLING_BACKEND = "mystery-backend";
    expect(() => getDoclingBackend()).toThrow(/Unsupported DOCLING_BACKEND/i);
  });

  it("reads python binary and timeout overrides", () => {
    process.env.DOCLING_PYTHON_BIN = "python3";
    process.env.DOCLING_TIMEOUT_MS = "45000";

    expect(getDoclingPythonBin()).toBe("python3");
    expect(getDoclingTimeoutMs()).toBe(45000);
  });
});
