import { createHash, randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDocumentParseProvider } from "../provider";
import {
  createDoclingProcessingRun,
  getDoclingTestViewModelForRun,
  getUserDoclingTestRuns,
  persistCompletedDoclingParse,
  replaceCurrentDoclingRunWithFailure,
} from "../data/repository";
import type { DoclingDocumentMode } from "../contracts";
import { type DoclingActivityLogger, DoclingTestError, toPublicDoclingTestError } from "../errors";
import { getDoclingBackend } from "../feature";
import { inferDoclingInputFormat, validateDoclingUploadMode } from "../validation";

export async function replaceDoclingTestWithUpload(params: {
  userId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  mode: DoclingDocumentMode;
  onLog?: DoclingActivityLogger;
}) {
  const { userId, fileBuffer, fileName, mimeType, fileSizeBytes, mode, onLog } = params;
  const logs: string[] = [];
  const log: DoclingActivityLogger = (message) => {
    logs.push(message);
    onLog?.(message);
  };

  const inputFormat = inferDoclingInputFormat(fileName, mimeType);
  validateDoclingUploadMode(mode, inputFormat);
  log(`Received upload "${fileName}" (${Math.round(fileSizeBytes / 1024)} KB).`);

  const contentHash = createHash("sha256").update(fileBuffer).digest("hex");
  let runId: string | null = null;
  const tempFilePath = join(tmpdir(), `docling-test-${randomUUID()}.${inputFormat}`);

  try {
    log("Computed the SHA-256 hash for duplicate detection.");
    log("Checking your existing saved docling-test runs for an identical completed parse.");
    const userRuns = await getUserDoclingTestRuns(userId, mode);
    const processingRun = userRuns.find((run) => run.parseStatus === "processing") ?? null;
    const duplicateRun =
      userRuns.find((run) => run.contentHash === contentHash && run.parseStatus === "completed") ?? null;

    if (processingRun) {
      log("Another docling-test job is already processing for this account.");
      throw new DoclingTestError(
        "docling-test is already processing a document. Wait for it to finish and try again.",
        409,
      );
    }

    if (duplicateRun) {
      log("Found an existing completed docling-test run with the same file hash. Reusing the saved SQL preview.");
      const viewModel = await getDoclingTestViewModelForRun(userId, duplicateRun.id);

      if (viewModel) {
        log("Loaded the saved docling-test preview from SQL.");
        return { isDuplicate: true, runId: duplicateRun.id, viewModel, logs };
      }
    }

    runId = randomUUID();
    log("No duplicate found. Creating a new processing run in SQL.");
    await createDoclingProcessingRun({
      runId,
      userId,
      contentHash,
      fileName,
      mimeType,
      fileSizeBytes,
      mode,
      inputFormat,
      provider: "docling",
      providerVersion: null,
      backend: getDoclingBackend(),
    });

    log("Writing the uploaded document to a temporary file for Docling.");
    await writeFile(tempFilePath, fileBuffer);

    const provider = getDocumentParseProvider();
    const result = await provider.parse({
      tempFilePath,
      originalFileName: fileName,
      mimeType,
      fileSizeBytes,
      inputFormat,
      mode,
      onLog: log,
    });

    log("Persisting the normalized course graph and Docling artifacts to SQL.");
    await persistCompletedDoclingParse({
      runId,
      provider: result.provider,
      providerVersion: result.providerVersion,
      payload: result.normalizedCandidate,
      markdown: result.markdown,
      rawJson: result.rawJson,
      stats: result.stats,
      warnings: result.warnings,
    });

    log("Reloading the saved docling-test preview from SQL.");
    const viewModel = await getDoclingTestViewModelForRun(userId, runId);
    if (!viewModel) {
      throw new DoclingTestError(
        "docling-test saved the document but could not reload the preview from SQL.",
        500,
      );
    }

    log("Saved docling-test preview loaded successfully.");
    return { isDuplicate: false, runId, viewModel, logs };
  } catch (error) {
    const publicError = toPublicDoclingTestError(error);

    log(`Docling parse failed: ${publicError.message}`);
    if (runId) {
      await replaceCurrentDoclingRunWithFailure(runId, userId, mode, publicError.message);
    }

    throw new DoclingTestError(publicError.message, publicError.status, {
      ...(publicError.details ?? {}),
      logs,
    });
  } finally {
    await rm(tempFilePath, { force: true });
  }
}
