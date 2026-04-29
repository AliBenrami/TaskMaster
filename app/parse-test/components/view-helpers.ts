import type { ParseTestViewModel } from "@/lib/parse-test/contracts";

export function formatDueAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatPercent(value: number | null) {
  if (value == null) {
    return null;
  }

  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

export function descriptionSourceLabel(source: string) {
  switch (source) {
    case "catalog_description":
      return "Official catalog description";
    case "course_objectives":
      return "Course objectives";
    case "learning_outcomes":
      return "Learning outcomes";
    default:
      return "Inferred from topics";
  }
}

export function uploadStatusLabel(uploadStatus: string | undefined) {
  switch (uploadStatus) {
    case "duplicate":
      return "Duplicate reuse";
    case "parsed":
      return "Fresh parse";
    case "deleted":
      return "Deleted";
    default:
      return "No recent upload";
  }
}

export function getMeetingFallback(preview: ParseTestViewModel) {
  const location = preview.course.meetingLocation?.toLowerCase() ?? "";
  const summary = `${preview.course.studentSummary} ${preview.course.catalogDescription ?? ""}`.toLowerCase();
  const looksOnline = location.includes("online") || summary.includes("asynchronous") || summary.includes("online");

  if (preview.course.meetingDays || preview.course.meetingTime) {
    return {
      primary: [preview.course.meetingDays, preview.course.meetingTime].filter(Boolean).join(" / "),
      secondary: preview.course.meetingLocation || "Location not clearly found",
    };
  }

  if (looksOnline) {
    return {
      primary: "Asynchronous online course",
      secondary: preview.course.meetingLocation || "No fixed weekly meeting time listed",
    };
  }

  return {
    primary: "Meeting days and time not clearly found",
    secondary: preview.course.meetingLocation || "Location not clearly found",
  };
}

export function getPreviewMetrics(preview: ParseTestViewModel) {
  const today = new Date();
  const datedAssignments = preview.assignments.filter((assignment) => assignment.dueAt);
  const upcomingAssignments = datedAssignments.filter(
    (assignment) => assignment.dueAt && new Date(assignment.dueAt).getTime() >= today.getTime(),
  );
  const nextAssignment = upcomingAssignments[0] ?? datedAssignments[0] ?? null;
  const totalGradedWeight = preview.gradingItems.reduce((sum, item) => sum + item.weightPercent, 0);

  return {
    datedAssignmentsCount: datedAssignments.length,
    upcomingAssignmentsCount: upcomingAssignments.length,
    nextAssignment,
    totalGradedWeight,
  };
}

export function getGradeDistributionStyle(items: ParseTestViewModel["gradingItems"]) {
  if (items.length === 0) {
    return {
      backgroundColor: "var(--border)",
    };
  }

  return {
    backgroundColor: "var(--foreground)",
  };
}
