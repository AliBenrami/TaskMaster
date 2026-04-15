import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/note-editor/note-editor", () => ({
  NoteEditor: ({
    initialDocument,
    onContentChange,
    onSave,
  }: {
    initialDocument: { blocks: Array<{ id?: string; type: string }> };
    onContentChange?: (content: {
      markdown: string;
      document: {
        time: number;
        blocks: unknown[];
      };
    }) => void;
    onSave?: (content: {
      markdown: string;
      document: {
        time: number;
        blocks: unknown[];
      };
    }) => Promise<void> | void;
  }) => {
    const firstBlock = initialDocument.blocks[0];
    const blockId = firstBlock?.id ?? "note-block";

    return (
      <div data-testid="mock-note-editor">
        <p>Mock Editor.js UI</p>
        <button
          type="button"
          aria-label={`Commit paragraph ${blockId}`}
          onClick={() => {
            const nextContent = {
              markdown: "Updated block",
              document: {
                time: 2,
                blocks: [
                  {
                    id: blockId,
                    type: "paragraph",
                    data: {
                      text: "Updated block",
                    },
                  },
                ],
              },
            };

            onContentChange?.(nextContent);
            void onSave?.(nextContent);
          }}
        >
          Commit paragraph
        </button>
        <button
          type="button"
          aria-label={`Commit paragraph and ordered list ${blockId}`}
          onClick={() => {
            const nextContent = {
              markdown: ["Updated block", "", "1. Inserted item"].join("\n"),
              document: {
                time: 3,
                blocks: [
                  {
                    id: blockId,
                    type: "paragraph",
                    data: {
                      text: "Updated block",
                    },
                  },
                  {
                    id: `${blockId}-list`,
                    type: "list",
                    data: {
                      style: "ordered",
                      items: [
                        {
                          content: "Inserted item",
                          items: [],
                        },
                      ],
                    },
                  },
                ],
              },
            };

            onContentChange?.(nextContent);
            void onSave?.(nextContent);
          }}
        >
          Commit paragraph and ordered list
        </button>
      </div>
    );
  },
}));

import { NoteSurface } from "@/components/note-editor/note-surface";

describe("NoteSurface", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders by default, enters full-note editor mode, and preserves Editor.js-added blocks", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <NoteSurface
        initialDocument={{
          time: 1,
          blocks: [
            {
              id: "header-1",
              type: "header",
              data: {
                level: 2,
                text: "Hybrid Notes",
              },
            },
            {
              id: "paragraph-1",
              type: "paragraph",
              data: {
                text: "Original block",
              },
            },
          ],
        }}
        onSave={onSave}
      />,
    );

    expect(screen.getByText("Hybrid Notes")).toBeInTheDocument();
    expect(screen.getByText("Original block")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-note-editor")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Open note editor"));
    expect(screen.getByTestId("mock-note-editor")).toBeInTheDocument();
    expect(screen.getByText("Mock Editor.js UI")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add block at end")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Commit paragraph header-1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(181);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls.at(-1)?.[0]?.markdown).toContain("Updated block");

    fireEvent.pointerDown(document.body);

    expect(screen.queryByTestId("mock-note-editor")).not.toBeInTheDocument();
    expect(screen.getByText("Updated block")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Open note editor"));
    fireEvent.click(screen.getByLabelText(/Commit paragraph and ordered list/));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(181);
    });

    expect(onSave).toHaveBeenCalledTimes(2);

    fireEvent.pointerDown(document.body);

    expect(screen.queryByTestId("mock-note-editor")).not.toBeInTheDocument();
    expect(screen.getByText("Updated block")).toBeInTheDocument();
    expect(screen.getByText("Inserted item")).toBeInTheDocument();
    expect(document.querySelector("ol")).not.toBeNull();
    expect(onSave.mock.calls.at(-1)?.[0]?.markdown).toContain("1. Inserted item");
  });

  it("resyncs the preview when the parent supplies a different note", () => {
    const { rerender } = render(
      <NoteSurface
        initialDocument={{
          time: 1,
          blocks: [
            {
              id: "note-a",
              type: "paragraph",
              data: {
                text: "First note",
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("First note")).toBeInTheDocument();

    rerender(
      <NoteSurface
        initialDocument={{
          time: 2,
          blocks: [
            {
              id: "note-b",
              type: "paragraph",
              data: {
                text: "Second note",
              },
            },
          ],
        }}
      />,
    );

    expect(screen.queryByText("First note")).not.toBeInTheDocument();
    expect(screen.getByText("Second note")).toBeInTheDocument();
  });

  it("does not double-fire onContentChange when a save completes", async () => {
    const onContentChange = vi.fn();

    render(
      <NoteSurface
        initialDocument={{
          time: 1,
          blocks: [
            {
              id: "header-1",
              type: "header",
              data: {
                level: 2,
                text: "Hybrid Notes",
              },
            },
          ],
        }}
        onContentChange={onContentChange}
      />,
    );

    fireEvent.click(screen.getByLabelText("Open note editor"));
    fireEvent.click(screen.getByLabelText("Commit paragraph header-1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(181);
    });

    expect(onContentChange).toHaveBeenCalledTimes(1);
  });

  it("keeps rendered links clickable and does not force editor mode", () => {
    render(
      <NoteSurface
        initialDocument={{
          time: 1,
          blocks: [
            {
              id: "link-note",
              type: "paragraph",
              data: {
                text: '<a href="https://example.com">Open link</a>',
              },
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "Open link" }));

    expect(screen.queryByTestId("mock-note-editor")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open link" })).toBeInTheDocument();
  });

  it("stays in editor mode when configured to keep editing while empty", () => {
    render(
      <NoteSurface
        initialDocument={{
          time: 1,
          blocks: [],
        }}
        keepEditingWhenEmpty
      />,
    );

    expect(screen.getByTestId("mock-note-editor")).toBeInTheDocument();
    expect(screen.queryByText("No note content yet.")).not.toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.getByTestId("mock-note-editor")).toBeInTheDocument();
  });

  it("does not close the editor when interacting with MathLive chrome", () => {
    render(
      <NoteSurface
        initialDocument={{
          time: 1,
          blocks: [
            {
              id: "math-note",
              type: "math",
              data: {
                latex: "x^2",
              },
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByLabelText("Open note editor"));
    expect(screen.getByTestId("mock-note-editor")).toBeInTheDocument();

    const virtualKeyboard = document.createElement("div");
    virtualKeyboard.className = "MLK__plate";
    document.body.append(virtualKeyboard);

    fireEvent.pointerDown(virtualKeyboard);

    expect(screen.getByTestId("mock-note-editor")).toBeInTheDocument();
  });

  it("opens the editor when clicking non-interactive preview content", () => {
    render(
      <NoteSurface
        initialDocument={{
          time: 1,
          blocks: [
            {
              id: "paragraph-1",
              type: "paragraph",
              data: {
                text: "Clickable preview",
              },
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByText("Clickable preview"));

    expect(screen.getByTestId("mock-note-editor")).toBeInTheDocument();
  });
});
