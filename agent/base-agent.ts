import { google } from "@ai-sdk/google";
import { InferAgentUIMessage, ToolLoopAgent, stepCountIs } from "ai";

export const baseAgent = new ToolLoopAgent({
  model: google("gemini-2.5-flash-lite"),
  instructions: `
You are the TaskMaster base AI agent.

Guidelines:
- Stay general-purpose and avoid domain assumptions.
- Ask concise clarifying questions when requirements are ambiguous.
- Prefer structured, implementation-friendly responses.
- Keep outputs concise and actionable.
`.trim(),
  stopWhen: stepCountIs(6),
  tools: {},
});

export type BaseAgentMessage = InferAgentUIMessage<typeof baseAgent>;
