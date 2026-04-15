import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import type { DocumentParseProvider, DocumentParseProviderInput } from "../contracts";
import { doclingProviderPayloadSchema } from "../contracts";
import { DoclingTestError } from "../errors";
import { getDoclingPythonBin, getDoclingTimeoutMs } from "../feature";
import { buildNormalizedCandidateFromMarkdown, summarizeDoclingArtifact } from "../heuristics";

const execFileAsync = promisify(execFile);
const WRAPPER_PATH = resolve(process.cwd(), "scripts", "docling_wrapper.py");

export class LocalDoclingPythonProvider implements DocumentParseProvider {
  async parse(input: DocumentParseProviderInput) {
    input.onLog?.("Running the local Python Docling wrapper.");

    let stdout = "";
    let stderr = "";

    try {
      const result = await execFileAsync(
        getDoclingPythonBin(),
        [WRAPPER_PATH, input.tempFilePath, input.inputFormat],
        {
          timeout: getDoclingTimeoutMs(),
          maxBuffer: 20 * 1024 * 1024,
        },
      );

      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      if (error instanceof Error && "stdout" in error) {
        stdout = String((error as { stdout?: unknown }).stdout ?? "");
        stderr = String((error as { stderr?: unknown }).stderr ?? "");
      }

      const extra = stderr.trim() || stdout.trim();
      throw new DoclingTestError(
        extra ? `Docling local Python parse failed: ${extra}` : "Docling local Python parse failed.",
        500,
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stdout);
    } catch {
      throw new DoclingTestError(
        stderr.trim()
          ? `Docling returned non-JSON output: ${stderr.trim()}`
          : "Docling did not return valid JSON.",
        500,
      );
    }

    const payload = doclingProviderPayloadSchema.safeParse(parsedJson);
    if (!payload.success) {
      throw new DoclingTestError(
        `Docling returned an invalid payload: ${payload.error.issues
          .map((issue) => issue.path.join(".") || "root")
          .join(", ")}`,
        500,
      );
    }

    input.onLog?.("Docling returned raw markdown and JSON artifacts.");
    const stats = summarizeDoclingArtifact(payload.data.rawJson);
    const normalizedCandidate = buildNormalizedCandidateFromMarkdown(
      payload.data.markdown,
      payload.data.warnings,
    );

    input.onLog?.("Mapped Docling markdown into the normalized academic schema.");

    return {
      provider: payload.data.provider,
      providerVersion: payload.data.providerVersion,
      inputFormat: payload.data.inputFormat,
      markdown: payload.data.markdown,
      rawJson: payload.data.rawJson,
      warnings: payload.data.warnings,
      stats,
      normalizedCandidate,
    };
  }
}
