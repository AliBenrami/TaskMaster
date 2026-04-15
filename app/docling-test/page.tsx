import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireServerSession } from "@/lib/auth-session";
import { isDoclingTestEnabled } from "@/lib/docling-test/feature";
import {
  getDoclingComparisonSummary,
  getDoclingTestRunSummaries,
  getDoclingTestViewModelForRun,
} from "@/lib/docling-test/service";
import { DoclingTestClient } from "./docling-test-client";
import { ComparisonPanel } from "./components/comparison-panel";
import { PageHeader } from "./components/page-header";
import { RawArtifactsPanel } from "./components/raw-artifacts-panel";
import { TechnicalPanel } from "./components/technical-panel";
import { EmptyPreviewState } from "./components/preview/empty-preview-state";
import { PreviewPane } from "./components/preview/preview-pane";
import { getGradeDistributionStyle, getPreviewMetrics } from "./components/view-helpers";

export default async function DoclingTestPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();

  if (!isDoclingTestEnabled()) {
    notFound();
  }

  const session = await requireServerSession("/docling-test");
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const uploadStatusParam = Array.isArray(searchParams?.upload)
    ? searchParams.upload[0]
    : searchParams?.upload;
  const runParam = Array.isArray(searchParams?.run) ? searchParams.run[0] : searchParams?.run;
  const runSummaries = await getDoclingTestRunSummaries(session.user.id);
  const selectedSummary =
    (runParam ? runSummaries.find((summary) => summary.runId === runParam) : null) ??
    runSummaries[0] ??
    null;
  const preview = selectedSummary
    ? await getDoclingTestViewModelForRun(session.user.id, selectedSummary.runId)
    : null;
  const comparison = preview
    ? await getDoclingComparisonSummary({
        userId: session.user.id,
        contentHash: preview.run.contentHash,
        inputFormat: preview.run.inputFormat,
        doclingRunId: preview.run.id,
      })
    : null;
  const metrics = preview ? getPreviewMetrics(preview) : null;
  const gradeDistributionStyle = preview ? getGradeDistributionStyle(preview.gradingItems) : null;
  const displayName = session.user.name || session.user.email;
  const currentIndex = selectedSummary
    ? runSummaries.findIndex((summary) => summary.runId === selectedSummary.runId)
    : -1;
  const prevRunId = currentIndex > 0 ? runSummaries[currentIndex - 1]?.runId ?? null : null;
  const nextRunId =
    currentIndex >= 0 && currentIndex < runSummaries.length - 1
      ? runSummaries[currentIndex + 1]?.runId ?? null
      : null;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:py-10">
        <PageHeader displayName={displayName} />

        <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <DoclingTestClient
            hasPreview={Boolean(preview)}
            courseTitle={preview?.course.title ?? null}
            events={preview?.events ?? []}
            savedAt={preview?.run.updatedAt ?? null}
            totalSavedRuns={runSummaries.length}
          />

          {preview && metrics && gradeDistributionStyle ? (
            <PreviewPane
              preview={preview}
              metrics={metrics}
              gradeDistributionStyle={gradeDistributionStyle}
              currentIndex={currentIndex}
              totalCount={runSummaries.length}
              prevRunId={prevRunId}
              nextRunId={nextRunId}
            />
          ) : (
            <EmptyPreviewState />
          )}
        </div>

        <TechnicalPanel
          preview={preview}
          uploadStatusParam={uploadStatusParam}
          displayName={displayName}
        />
        <ComparisonPanel comparison={comparison} />
        <RawArtifactsPanel preview={preview} />
      </main>
    </div>
  );
}
