import type { DoclingTestViewModel } from "@/lib/docling-test/contracts";

export function getPreviewMetrics(preview: DoclingTestViewModel) {
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

export function getGradeDistributionStyle(items: DoclingTestViewModel["gradingItems"]) {
  if (items.length === 0) {
    return {
      background: "conic-gradient(from 180deg, rgba(228,228,231,1) 0deg 360deg)",
    };
  }

  const colors = ["#18181b", "#52525b", "#71717a", "#a1a1aa", "#d4d4d8", "#3f3f46"];

  let current = 0;
  const segments = items.map((item, index) => {
    const start = current;
    current += Math.max(0, item.weightPercent);
    return `${colors[index % colors.length]} ${start}% ${current}%`;
  });

  if (current < 100) {
    segments.push(`#e4e4e7 ${current}% 100%`);
  }

  return {
    background: `conic-gradient(from 180deg, ${segments.join(", ")})`,
  };
}
