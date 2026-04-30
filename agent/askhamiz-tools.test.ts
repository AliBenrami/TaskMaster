import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const limit = vi.fn();
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return {
    listUserClasses: vi.fn(),
    listUserClassEvents: vi.fn(),
    limit,
    orderBy,
    where,
    from,
    select,
  };
});

vi.mock("@/lib/classes/queries", () => ({
  assertClassBelongsToUser: vi.fn(),
  listUserClasses: mocks.listUserClasses,
  listUserClassEvents: mocks.listUserClassEvents,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
  },
}));

describe("AskHamiz tools", () => {
  beforeEach(() => {
    mocks.listUserClasses.mockReset();
    mocks.listUserClassEvents.mockReset();
    mocks.select.mockClear();
    mocks.from.mockClear();
    mocks.where.mockClear();
    mocks.orderBy.mockClear();
    mocks.limit.mockReset();
  });

  it("builds daily summary data scoped to the supplied user", async () => {
    const now = new Date("2026-04-29T15:00:00.000Z");
    mocks.listUserClasses.mockResolvedValue([
      {
        courseId: "class-1",
        runId: "run-1",
        title: "Databases",
        courseCode: "CS 430",
        noteCount: 2,
      },
    ]);
    mocks.listUserClassEvents.mockResolvedValue([
      {
        id: "event-1",
        courseId: "class-1",
        courseTitle: "Databases",
        title: "Project due",
        category: "assignment",
        dateText: "April 30",
        dueAt: new Date("2026-04-30T05:00:00.000Z"),
        timeText: null,
        location: null,
      },
    ]);
    mocks.limit.mockResolvedValue([
      {
        id: "note-1",
        title: "Indexing notes",
        classId: "class-1",
        sourceType: "manual",
        fileName: null,
        updatedAt: new Date("2026-04-28T15:00:00.000Z"),
      },
    ]);

    const { getDailySummaryData } = await import("./askhamiz-tools");
    const summary = await getDailySummaryData("user-123", now);

    expect(mocks.listUserClasses).toHaveBeenCalledWith("user-123");
    expect(mocks.listUserClassEvents).toHaveBeenCalledWith("user-123");
    expect(summary).toMatchObject({
      generatedAt: "2026-04-29T15:00:00.000Z",
      classCount: 1,
      recentNotes: [{ id: "note-1", title: "Indexing notes" }],
      upcomingEvents: [{ id: "event-1", dueAt: "2026-04-30T05:00:00.000Z" }],
    });
  });
});
