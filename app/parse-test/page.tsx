import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireServerSession } from "@/lib/auth-session";
import { isParseTestEnabled } from "@/lib/parse-test/feature";
import { getParseTestRunSummaries, getParseTestViewModelForRun } from "@/lib/parse-test/service";
import { ParseTestClient } from "./parse-test-client";
import { PageHeader } from "./components/page-header";
import { PreviewPane } from "./components/preview/preview-pane";
import { EmptyPreviewState } from "./components/preview/empty-preview-state";
import { TechnicalPanel } from "./components/technical-panel";
import { getGradeDistributionStyle, getPreviewMetrics } from "./components/view-helpers";

export default async function ParseTestPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();

  if (!isParseTestEnabled()) {
    notFound();
  }

  const session = await requireServerSession("/parse-test");
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const uploadStatusParam = Array.isArray(searchParams?.upload)
    ? searchParams.upload[0]
    : searchParams?.upload;
  const runParam = Array.isArray(searchParams?.run) ? searchParams.run[0] : searchParams?.run;
  const runSummaries = await getParseTestRunSummaries(session.user.id);
  const selectedSummary =
    (runParam ? runSummaries.find((summary) => summary.runId === runParam) : null) ?? runSummaries[0] ?? null;
  const preview = selectedSummary
    ? await getParseTestViewModelForRun(session.user.id, selectedSummary.runId)
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
          <ParseTestClient
            hasPreview={Boolean(preview)}
            courseTitle={preview?.course.title ?? null}
            events={preview?.events ?? []}
            savedAt={preview?.run.updatedAt ?? null}
            totalSavedClasses={runSummaries.length}
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
      </main>
    </div>
  );
}
