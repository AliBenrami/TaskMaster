import { deleteParseTestRunRecord, getParseTestViewModel, getParseTestViewModelForRun } from "./data/repository";
import { getNormalizedParseTestSchedule, getParseTestRunSummaries } from "./data/queries";
import { ParseTestError, toPublicParseTestError } from "./errors";
import { replaceParseTestWithUpload } from "./upload/replace";

export {
  getParseTestRunSummaries,
  getParseTestViewModel,
  getParseTestViewModelForRun,
  getNormalizedParseTestSchedule,
  replaceParseTestWithUpload,
};

export async function deleteParseTestRun(params: { userId: string; runId: string }) {
  const result = await deleteParseTestRunRecord(params);

  if (!result) {
    throw new ParseTestError("That saved class could not be found.", 404);
  }

  return result;
}

export function getParseTestErrorResponse(error: unknown) {
  const publicError = toPublicParseTestError(error);

  return {
    message: publicError.message,
    status: publicError.status,
    details: publicError.details,
  };
}
