import {
  deleteDoclingTestRunRecord,
  getDoclingTestViewModel,
  getDoclingTestViewModelForRun,
} from "./data/repository";
import {
  getDoclingComparisonSummary,
  getDoclingTestRunSummaries,
  getNormalizedDoclingTestSchedule,
} from "./data/queries";
import { DoclingTestError, toPublicDoclingTestError } from "./errors";
import { replaceDoclingTestWithUpload } from "./upload/replace";

export {
  getDoclingComparisonSummary,
  getDoclingTestRunSummaries,
  getDoclingTestViewModel,
  getDoclingTestViewModelForRun,
  getNormalizedDoclingTestSchedule,
  replaceDoclingTestWithUpload,
};

export async function deleteDoclingTestRun(params: { userId: string; runId: string }) {
  const result = await deleteDoclingTestRunRecord(params);

  if (!result) {
    throw new DoclingTestError("That saved docling-test run could not be found.", 404);
  }

  return result;
}

export function getDoclingTestErrorResponse(error: unknown) {
  const publicError = toPublicDoclingTestError(error);

  return {
    message: publicError.message,
    status: publicError.status,
    details: publicError.details,
  };
}
