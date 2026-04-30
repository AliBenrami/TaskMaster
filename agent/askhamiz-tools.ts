import { and, desc, eq } from "drizzle-orm";
import { tool } from "ai";
import { z } from "zod";
import { assertClassBelongsToUser, listUserClassEvents, listUserClasses } from "@/lib/classes/queries";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";
import { emptyNoteDocument } from "@/lib/notes/types";

export type AskHamizToolContext = {
  userId: string;
};

function getUserId(context: unknown) {
  const candidate = context as Partial<AskHamizToolContext> | undefined;
  if (!candidate?.userId) {
    throw new Error("AskHamiz tool context is missing an authenticated user.");
  }

  return candidate.userId;
}

function toIso(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return (value instanceof Date ? value : new Date(value)).toISOString();
}

async function getOwnedNote(userId: string, noteId: string) {
  const [found] = await db
    .select()
    .from(note)
    .where(and(eq(note.id, noteId), eq(note.userId, userId)))
    .limit(1);

  return found ?? null;
}

async function getRecentNotes(userId: string, limit = 5) {
  const rows = await db
    .select({
      id: note.id,
      title: note.title,
      classId: note.classId,
      sourceType: note.sourceType,
      fileName: note.fileName,
      updatedAt: note.updatedAt,
    })
    .from(note)
    .where(eq(note.userId, userId))
    .orderBy(desc(note.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getDailySummaryData(userId: string, now = new Date()) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const classes = await listUserClasses(userId);
  const recentNotes = await getRecentNotes(userId, 5);
  const upcomingEvents = await listUserClassEvents(userId);
  const nextEvents = upcomingEvents
    .filter((event) => !event.dueAt || event.dueAt >= todayStart)
    .slice(0, 8)
    .map((event) => ({
      id: event.id,
      courseId: event.courseId,
      courseTitle: event.courseTitle,
      title: event.title,
      category: event.category,
      dateText: event.dateText,
      dueAt: toIso(event.dueAt),
      timeText: event.timeText,
      location: event.location,
    }));

  return {
    generatedAt: now.toISOString(),
    classCount: classes.length,
    classes: classes.slice(0, 8),
    recentNotes,
    upcomingEvents: nextEvents,
  };
}

export const askHamizTools = {
  getDailySummary: tool({
    description:
      "Get a compact daily academic summary for the authenticated user: classes, recent notes, and upcoming parsed calendar items.",
    inputSchema: z.object({}),
    execute: async (_input, options) => getDailySummaryData(getUserId(options.experimental_context)),
  }),
  listClasses: tool({
    description: "List the authenticated user's saved parsed classes.",
    inputSchema: z.object({}),
    execute: async (_input, options) => listUserClasses(getUserId(options.experimental_context)),
  }),
  listCalendarEvents: tool({
    description: "List parsed class calendar events and assignments for the authenticated user.",
    inputSchema: z.object({
      upcomingOnly: z.boolean().default(false).describe("When true, only return events due today or later."),
    }),
    execute: async ({ upcomingOnly }, options) => {
      const events = await listUserClassEvents(getUserId(options.experimental_context));
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      return events
        .filter((event) => !upcomingOnly || !event.dueAt || event.dueAt >= todayStart)
        .map((event) => ({
          ...event,
          dueAt: toIso(event.dueAt),
        }));
    },
  }),
  createNote: tool({
    description: "Create a manual note for the authenticated user. Optionally link it to a class owned by the user.",
    inputSchema: z.object({
      title: z.string().optional().describe("Note title. Defaults to Untitled."),
      markdown: z.string().optional().describe("Plain markdown-ish text to put in the first note paragraph."),
      classId: z.string().nullable().optional().describe("Class id to link, or null for no class."),
    }),
    execute: async ({ title, markdown, classId }, options) => {
      const userId = getUserId(options.experimental_context);
      const trimmedClassId = classId?.trim() || null;

      if (trimmedClassId) {
        const ownedClass = await assertClassBelongsToUser(trimmedClassId, userId);
        if (!ownedClass) {
          throw new Error("Invalid class selection.");
        }
      }

      const text = markdown?.trim() ?? "";
      const [created] = await db
        .insert(note)
        .values({
          userId,
          title: title?.trim() || "Untitled",
          classId: trimmedClassId,
          sourceType: "manual",
          content: {
            ...emptyNoteDocument,
            blocks: text
              ? [
                  {
                    id: crypto.randomUUID(),
                    type: "paragraph",
                    data: { text },
                  },
                ]
              : [],
          },
        })
        .returning();

      return {
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    },
  }),
  updateNote: tool({
    description: "Update a note owned by the authenticated user. Can update title, markdown text, or class link.",
    inputSchema: z.object({
      noteId: z.string().min(1),
      title: z.string().optional(),
      markdown: z.string().optional().describe("Plain markdown-ish text to replace the note body."),
      classId: z.string().nullable().optional(),
    }),
    execute: async ({ noteId, title, markdown, classId }, options) => {
      const userId = getUserId(options.experimental_context);
      const existing = await getOwnedNote(userId, noteId);
      if (!existing) {
        throw new Error("Note not found.");
      }

      const updates: {
        title?: string;
        content?: unknown;
        classId?: string | null;
      } = {};

      if (title !== undefined) {
        updates.title = title.trim() || "Untitled";
      }

      if (markdown !== undefined) {
        const text = markdown.trim();
        updates.content = {
          ...emptyNoteDocument,
          blocks: text
            ? [
                {
                  id: crypto.randomUUID(),
                  type: "paragraph",
                  data: { text },
                },
              ]
            : [],
        };
      }

      if (classId !== undefined) {
        const trimmedClassId = classId?.trim() || null;
        if (trimmedClassId) {
          const ownedClass = await assertClassBelongsToUser(trimmedClassId, userId);
          if (!ownedClass) {
            throw new Error("Invalid class selection.");
          }
        }

        updates.classId = trimmedClassId;
      }

      if (Object.keys(updates).length === 0) {
        return {
          ...existing,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString(),
        };
      }

      const [updated] = await db
        .update(note)
        .set(updates)
        .where(and(eq(note.id, noteId), eq(note.userId, userId)))
        .returning();

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
  }),
  deleteNote: tool({
    description:
      "Delete a note owned by the authenticated user. Use only when the user explicitly asks to delete a specific note.",
    inputSchema: z.object({
      noteId: z.string().min(1),
      confirmation: z.string().describe("The user's explicit deletion wording."),
    }),
    execute: async ({ noteId, confirmation }, options) => {
      if (!/\b(delete|remove|trash)\b/i.test(confirmation)) {
        throw new Error("Deletion requires explicit delete/remove/trash wording from the user.");
      }

      const userId = getUserId(options.experimental_context);
      const existing = await getOwnedNote(userId, noteId);
      if (!existing) {
        throw new Error("Note not found.");
      }

      await db.delete(note).where(and(eq(note.id, noteId), eq(note.userId, userId)));

      return {
        success: true,
        deletedNoteId: noteId,
        title: existing.title,
      };
    },
  }),
};
