"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { ParseTestViewModel } from "@/lib/parse-test/contracts";
import { EventFeed } from "./components/event-feed";
import { UploadPanel } from "./components/upload-panel";

type ParseTestClientProps = {
  hasPreview: boolean;
  courseTitle: string | null;
  events: ParseTestViewModel["events"];
  savedAt: string | null;
  totalSavedClasses: number;
};

type ParseStreamEvent =
  | { type: "start" }
  | { type: "log"; message: string }
  | { type: "result"; ok: true; isDuplicate?: boolean; runId?: string }
  | { type: "error"; error: string; status?: number };

function formatDisplayDate(dueAt: string | null, dateText: string) {
  if (!dueAt) {
    return dateText;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dueAt));
}

function formatSavedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function slugifyFilePart(value: string | null) {
  const base = (value || "parse-test-events")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "parse-test-events";
}

export function ParseTestClient({
  hasPreview,
  courseTitle,
  events,
  savedAt,
  totalSavedClasses,
}: ParseTestClientProps) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<string[]>([]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setExportMessage(null);
    setActivityLogs([]);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage(null);
      setError("Choose a syllabus PDF before starting the parse.");
      return;
    }

    setIsUploading(true);
    setMessage("Parsing the syllabus and saving your preview to SQL.");
    setActivityLogs([
      `Selected file: ${file.name}`,
      "Submitting the upload to the ParseTest API.",
      "Waiting for local validation, duplicate detection, Gemini, and SQL persistence.",
    ]);

    try {
      const response = await fetch("/api/parse-test", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; logs?: string[] }
          | null;
        setActivityLogs(payload?.logs ?? []);
        throw new Error(payload?.error || "ParseTest could not parse the uploaded syllabus.");
      }

      if (!response.body) {
        throw new Error("ParseTest did not return a readable activity stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: Extract<ParseStreamEvent, { type: "result" }> | null = null;
      let streamError: string | null = null;

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            continue;
          }

          const event = JSON.parse(trimmed) as ParseStreamEvent;

          if (event.type === "log") {
            setActivityLogs((current) => current.concat(event.message));
            continue;
          }

          if (event.type === "error") {
            streamError = event.error;
          }

          if (event.type === "result") {
            finalResult = event;
          }
        }
      }

      if (buffer.trim()) {
        const event = JSON.parse(buffer.trim()) as ParseStreamEvent;
        if (event.type === "log") {
          setActivityLogs((current) => current.concat(event.message));
        } else if (event.type === "error") {
          streamError = event.error;
        } else if (event.type === "result") {
          finalResult = event;
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }

      if (!finalResult) {
        throw new Error("ParseTest finished without a final result.");
      }

      const uploadStatus = finalResult.isDuplicate ? "duplicate" : "parsed";
      setMessage(
        finalResult.isDuplicate
          ? "This syllabus matches your current saved record. Reloading the SQL preview."
          : "Syllabus parsed and saved to SQL. Reloading the preview from the database now.",
      );
      setActivityLogs((current) => current.concat("Refreshing the page with the saved SQL-backed preview."));

      startTransition(() => {
        const nextUrl = finalResult.runId
          ? `/parse-test?run=${encodeURIComponent(finalResult.runId)}&upload=${uploadStatus}`
          : `/parse-test?upload=${uploadStatus}`;
        router.replace(nextUrl);
        router.refresh();
      });
    } catch (submissionError) {
      setMessage(null);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "ParseTest hit an unexpected upload error.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setSelectedFileName(file?.name ?? null);
    setMessage(null);
    setError(null);
    setActivityLogs([]);
  }

  function handleExport() {
    if (events.length === 0) {
      setExportMessage("No saved events are available to export yet.");
      return;
    }

    const payload = {
      course: courseTitle,
      exportedAt: new Date().toISOString(),
      events: events.map((event) => ({
        title: event.title,
        category: event.category,
        isoDate: event.dueAt,
        dateText: event.dateText,
        timeText: event.timeText,
        location: event.location,
        sourceSnippet: event.sourceSnippet,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugifyFilePart(courseTitle)}-events.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    setExportMessage("UTF-8 JSON export downloaded from the saved SQL event feed.");
  }

  const isBusy = isUploading || isNavigating;

  return (
    <div className="space-y-6">
      <UploadPanel
        hasPreview={hasPreview}
        totalSavedClasses={totalSavedClasses}
        selectedFileName={selectedFileName}
        isBusy={isBusy}
        message={message}
        error={error}
        activityLogs={activityLogs}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
      />
      <EventFeed
        events={events}
        savedAt={savedAt}
        exportMessage={exportMessage}
        onExport={handleExport}
        formatDisplayDate={formatDisplayDate}
        formatSavedAt={formatSavedAt}
      />
    </div>
  );
}
