import { createHash, randomUUID } from "node:crypto";
import {
  createProcessingRun,
  getParseTestViewModelForRun,
  getUserParseTestRuns,
  persistCompletedParse,
  replaceCurrentRunWithFailure,
} from "../data/repository";
import { ParseActivityLogger, ParseTestError, toPublicParseTestError } from "../errors";
import { getParseTestModel } from "../feature";
import { parseSyllabusWithGemini } from "../gemini/parse";
import { validateSyllabusCandidate } from "../validation/syllabus";

export async function replaceParseTestWithUpload(params: {
  userId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  onLog?: ParseActivityLogger;
}) {
  const { userId, fileBuffer, fileName, mimeType, fileSizeBytes, onLog } = params;
  const logs: string[] = [];
  const log: ParseActivityLogger = (message) => {
    logs.push(message);
    onLog?.(message);
  };

  log(`Received upload "${fileName}" (${Math.round(fileSizeBytes / 1024)} KB).`);
  const contentHash = createHash("sha256").update(fileBuffer).digest("hex");
  const parseModel = getParseTestModel();
  let runId: string | null = null;

  try {
    log("Computed the SHA-256 hash for duplicate detection.");
    validateSyllabusCandidate(fileName, fileBuffer, log);
    log("Checking your existing saved classes for an identical completed parse.");
    const userRuns = await getUserParseTestRuns(userId);
    const processingRun = userRuns.find((run) => run.parseStatus === "processing") ?? null;
    const duplicateRun =
      userRuns.find((run) => run.contentHash === contentHash && run.parseStatus === "completed") ?? null;

    if (processingRun) {
      log("Another ParseTest job is already processing for this account.");
      throw new ParseTestError("ParseTest is already processing a syllabus. Wait for it to finish and try again.", 409);
    }

    if (duplicateRun) {
      log("Found an existing completed class with the same file hash. Reusing the saved SQL preview.");
      const viewModel = await getParseTestViewModelForRun(userId, duplicateRun.id);

      if (viewModel) {
        log("Loaded the saved preview from SQL.");
        return { isDuplicate: true, runId: duplicateRun.id, viewModel, logs };
      }
    }

    runId = randomUUID();

    log("No duplicate found. Creating a new processing run in SQL.");
    await createProcessingRun({
      runId,
      userId,
      contentHash,
      fileName,
      mimeType,
      fileSizeBytes,
      parseModel,
    });

    const { payload, geminiFileUri } = await parseSyllabusWithGemini(fileName, fileBuffer, log);
    log("Persisting the normalized course graph to SQL.");
    await persistCompletedParse({
      runId,
      geminiFileUri,
      payload,
    });

    log("Reloading the saved preview from SQL.");
    const viewModel = await getParseTestViewModelForRun(userId, runId);
    if (!viewModel) {
      throw new ParseTestError("ParseTest saved the syllabus but could not reload the preview from SQL.", 500);
    }

    log("Saved preview loaded successfully.");
    return { isDuplicate: false, runId, viewModel, logs };
  } catch (error) {
    const publicError = toPublicParseTestError(error);

    log(`Parse failed: ${publicError.message}`);
    if (runId) {
      await replaceCurrentRunWithFailure(runId, userId, publicError.message);
    }

    throw new ParseTestError(publicError.message, publicError.status, {
      ...(publicError.details ?? {}),
      logs,
    });
  }
}
