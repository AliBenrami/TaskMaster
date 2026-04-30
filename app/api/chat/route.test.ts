import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  createAgentUIStreamResponse: vi.fn(),
  createAskHamizAgent: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ cookie: "session=abc" })),
}));

vi.mock("ai", () => ({
  createAgentUIStreamResponse: mocks.createAgentUIStreamResponse,
}));

vi.mock("@/agent/base-agent", () => ({
  createAskHamizAgent: mocks.createAskHamizAgent,
}));

describe("POST /api/chat", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.createAgentUIStreamResponse.mockReset();
    mocks.createAskHamizAgent.mockReset();
    mocks.createAskHamizAgent.mockReturnValue({ id: "agent" });
    mocks.createAgentUIStreamResponse.mockResolvedValue(new Response("stream"));
  });

  it("returns 401 when the user is unauthenticated", async () => {
    mocks.getSession.mockResolvedValue(null);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [] }),
      }),
    );

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.createAgentUIStreamResponse).not.toHaveBeenCalled();
  });

  it("creates a user-scoped AskHamiz agent for authenticated requests", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-123" } });
    const { POST } = await import("./route");
    const messages = [{ id: "m1", role: "user", parts: [{ type: "text", text: "Daily summary" }] }];

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createAskHamizAgent).toHaveBeenCalledWith({ userId: "user-123" });
    expect(mocks.createAgentUIStreamResponse).toHaveBeenCalledWith({
      agent: { id: "agent" },
      uiMessages: messages,
    });
  });
});
