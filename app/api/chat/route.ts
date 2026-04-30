import { createAskHamizAgent, type BaseAgentMessage } from "@/agent/base-agent";
import { auth } from "@/lib/auth";
import { createAgentUIStreamResponse } from "ai";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages }: { messages: BaseAgentMessage[] } = await req.json();

  return createAgentUIStreamResponse({
    agent: createAskHamizAgent({ userId: session.user.id }),
    uiMessages: messages,
  });
}
