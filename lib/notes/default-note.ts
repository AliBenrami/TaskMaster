import type { NoteDocument } from "@/lib/notes/types";

export const defaultTestNote: NoteDocument = {
  time: Date.now(),
  blocks: [
    {
      type: "header",
      data: {
        text: "TaskMaster note editor test bed",
        level: 1,
      },
    },
    {
      type: "paragraph",
      data: {
        text: "This seeded note is here so you can test <b>rich text</b>, <i>math</i>, lists, code blocks, and image insertion directly from the root route.",
      },
    },
    {
      type: "header",
      data: {
        text: "Checklist",
        level: 2,
      },
    },
    {
      type: "list",
      data: {
        style: "checklist",
        items: [
          {
            content: "Edit a paragraph block",
            meta: {
              checked: true,
            },
            items: [],
          },
          {
            content: "Insert an image block",
            meta: {
              checked: false,
            },
            items: [],
          },
          {
            content: "Create a math block and save it",
            meta: {
              checked: false,
            },
            items: [],
          },
        ],
      },
    },
    {
      type: "quote",
      data: {
        text: "Round-trip fidelity matters more than visual polish in this pass.",
        caption: "Feature scope",
        alignment: "left",
      },
    },
    {
      type: "code",
      data: {
        code: "const document = await editor.save();\nconsole.log(document.blocks.length);",
      },
    },
    {
      type: "math",
      data: {
        latex: "\\int_0^1 x^2\\,dx=\\frac{1}{3}",
      },
    },
  ],
};
