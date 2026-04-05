import { baseAgent, type BaseAgentMessage } from "@/agent/base-agent";
import { createAgentUIStreamResponse } from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: BaseAgentMessage[] } = await req.json();

  return createAgentUIStreamResponse({
    agent: baseAgent,
    uiMessages: messages,
  });
}
