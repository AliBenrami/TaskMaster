import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ASKHAMIZ_FACES } from "./askhamiz-utils";
import { AskHamizWidget, FaceAvatar } from "./askhamiz-widget";

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(() => ({
    messages: [],
    sendMessage: mocks.sendMessage,
    status: "ready",
    error: undefined,
    stop: mocks.stop,
  })),
}));

describe("AskHamizWidget face assets", () => {
  beforeEach(() => {
    mocks.sendMessage.mockReset();
    mocks.stop.mockReset();
  });

  it("renders the active face image with accessible alt text", () => {
    render(<FaceAvatar face={ASKHAMIZ_FACES[0]} />);

    const image = screen.getByAltText("Happy AskHamiz face");
    expect(image).toHaveAttribute("src", expect.stringContaining("/askhamiz/faces/happy.webp"));
  });

  it("falls back to initials when the face image fails to load", () => {
    render(<FaceAvatar face={ASKHAMIZ_FACES[5]} />);

    fireEvent.error(screen.getByAltText("ImposterAmongus AskHamiz face"));

    expect(screen.getByText("I")).toBeInTheDocument();
  });

  it("toggles audio mute state without hiding chat controls", () => {
    render(<AskHamizWidget />);

    fireEvent.click(screen.getByLabelText("Open AskHamiz"));
    expect(screen.getByLabelText("Unmute AskHamiz face audio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daily summary" })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Unmute AskHamiz face audio"));

    expect(screen.getByLabelText("Mute AskHamiz face audio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daily summary" })).toBeInTheDocument();
  });
});
