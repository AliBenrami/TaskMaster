import { dataParsingAgent, type DataParsingAgentMessage } from "@/agent/data-parsing-agent";
import { createAgentUIStreamResponse } from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: DataParsingAgentMessage[] } = await req.json();

  return createAgentUIStreamResponse({
    agent: dataParsingAgent,
    uiMessages: messages,
  });
}
