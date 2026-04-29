import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Button, getButtonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireServerSession } from "@/lib/auth-session";
import { isParseTestEnabled } from "@/lib/parse-test/feature";
import { getParseTestRunSummaries, getParseTestViewModelForRun } from "@/lib/parse-test/service";
import { ParseTestClient } from "@/app/parse-test/parse-test-client";
import { PreviewPane } from "@/app/parse-test/components/preview/preview-pane";
import { EmptyPreviewState } from "@/app/parse-test/components/preview/empty-preview-state";
import { TechnicalPanel } from "@/app/parse-test/components/technical-panel";
import { getGradeDistributionStyle, getPreviewMetrics } from "@/app/parse-test/components/view-helpers";

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
    (runParam ? runSummaries.find((summary) => summary.runId === runParam) : null) ??
    runSummaries[0] ??
    null;
  const preview = selectedSummary
    ? await getParseTestViewModelForRun(session.user.id, selectedSummary.runId)
    : null;
  const metrics = preview ? getPreviewMetrics(preview) : null;
  const gradeDistributionStyle = preview ? getGradeDistributionStyle(preview.gradingItems) : null;
  const currentIndex = selectedSummary
    ? runSummaries.findIndex((summary) => summary.runId === selectedSummary.runId)
    : -1;
  const prevRunId = currentIndex > 0 ? runSummaries[currentIndex - 1]?.runId ?? null : null;
  const nextRunId =
    currentIndex >= 0 && currentIndex < runSummaries.length - 1
      ? runSummaries[currentIndex + 1]?.runId ?? null
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Syllabus parsing"
        title="Classes start here"
        description="Upload a syllabus, let ParseTest structure it, and use the resulting class as the anchor for notes and future study tools."
        actions={
          <>
            <Link href="/classes" className={getButtonClassName("outline")}>
              View classes
            </Link>
            <Button type="button" disabled>
              AI pipeline live
            </Button>
          </>
        }
      />

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
        displayName={session.user.name || session.user.email}
      />
    </div>
  );
}
