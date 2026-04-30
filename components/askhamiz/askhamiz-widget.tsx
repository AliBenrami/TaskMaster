"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import {
  Bot,
  FileUp,
  Loader2,
  MessageCircle,
  Minus,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { BaseAgentMessage } from "@/agent/base-agent";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/utils";
import {
  ASKHAMIZ_FACES,
  type AskHamizFace,
  buildAskHamizPrompt,
  detectAskHamizMode,
  getFaceInitials,
  getNextFaceIndex,
} from "./askhamiz-utils";

type FaceAvatarProps = {
  face: AskHamizFace;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
};

export function FaceAvatar({ face, size = "md", animated = false }: FaceAvatarProps) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const sizeClass =
    size === "sm" ? "h-12 w-12" : size === "lg" ? "h-24 w-24" : "h-16 w-16";
  const imageSize = size === "lg" ? 96 : size === "sm" ? 48 : 64;
  const hasImageError = failedImageSrc === face.imageSrc;

  return (
    <div
      className={cx(
        "flex flex-none items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted",
        sizeClass,
      )}
    >
      {hasImageError ? (
        <span className={cx(size === "lg" ? "text-2xl" : "text-base", "font-semibold", animated && "animate-pulse")}>
          {getFaceInitials(face)}
        </span>
      ) : (
        <Image
          src={face.imageSrc}
          alt={`${face.label} AskHamiz face`}
          width={imageSize}
          height={imageSize}
          unoptimized
          className={cx("h-full w-full object-cover", animated && "animate-pulse")}
          onError={() => setFailedImageSrc(face.imageSrc)}
        />
      )}
    </div>
  );
}

function ToolPartView({ part }: { part: BaseAgentMessage["parts"][number] }) {
  const toolName = part.type.startsWith("tool-") ? part.type.slice("tool-".length) : "tool";
  const state = "state" in part && typeof part.state === "string" ? part.state : "working";

  return (
    <div className="mt-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{toolName}</span> {state.replaceAll("-", " ")}
    </div>
  );
}

function MessageBubble({ message }: { message: BaseAgentMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[86%] rounded-xl px-3 py-2 text-sm leading-6",
          isUser
            ? "bg-accent text-accent-foreground"
            : "border border-border bg-surface text-foreground",
        )}
      >
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <p key={index} className="whitespace-pre-wrap">
                {part.text}
              </p>
            );
          }

          return <ToolPartView key={index} part={part} />;
        })}
      </div>
    </div>
  );
}

type UploadResponse = {
  notes?: Array<{ id: string; title: string }>;
  error?: string;
};

export function AskHamizWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [faceIndex, setFaceIndex] = useState(0);
  const [mode, setMode] = useState<ReturnType<typeof detectAskHamizMode>>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport<BaseAgentMessage>({
        api: "/api/chat",
        credentials: "same-origin",
      }),
    [],
  );
  const { messages, sendMessage, status, error, stop } = useChat<BaseAgentMessage>({
    transport,
  });
  const isBusy = status === "submitted" || status === "streaming";
  const activeFace = ASKHAMIZ_FACES[faceIndex];

  function playFaceAudio(face: AskHamizFace) {
    if (isAudioMuted || typeof Audio === "undefined") {
      return;
    }

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.pause();
    audio.currentTime = 0;
    audio.src = face.audioSrc;
    audio.volume = 0.45;
    void audio.play().catch(() => {
      // Missing files and autoplay restrictions should never block chat.
    });
  }

  function cycleFaceForPrompt(value: string) {
    const nextMode = detectAskHamizMode(value);
    setMode(nextMode);
    setFaceIndex((current) => {
      const nextIndex = getNextFaceIndex(current);
      playFaceAudio(ASKHAMIZ_FACES[nextIndex]);
      return nextIndex;
    });
  }

  function sendAskHamizMessage(value: string) {
    const trimmed = value.trim();
    if (!trimmed || isBusy) {
      return;
    }

    cycleFaceForPrompt(trimmed);
    void sendMessage({ text: buildAskHamizPrompt(trimmed) });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextInput = input;
    setInput("");
    sendAskHamizMessage(nextInput);
  }

  async function handleUpload(file: File) {
    setUploadStatus(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", file.name.replace(/\.[^.]+$/, "") || "Uploaded Note");

    const response = await fetch("/api/notes/upload", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as UploadResponse | null;

    if (!response.ok) {
      throw new Error(payload?.error || "Could not upload this file.");
    }

    const createdNotes = payload?.notes ?? [];
    setUploadStatus(
      `Created ${createdNotes.length} note${createdNotes.length === 1 ? "" : "s"} from ${file.name}.`,
    );
    sendAskHamizMessage(
      `I uploaded ${file.name} to AskHamiz. Summarize the upload result: ${createdNotes
        .map((item) => item.title)
        .join(", ") || "no note titles returned"}.`,
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3">
      {isOpen ? (
        <section
          className={cx(
            "flex max-h-[min(860px,82vh)] w-[min(560px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_80px_-40px_rgb(0_0_0/0.55)]",
            mode === "herbert" && "ring-2 ring-amber-300/70",
            mode === "hamiz" && "ring-2 ring-emerald-300/70",
          )}
          aria-label="AskHamiz chat"
        >
          <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-4">
              <FaceAvatar face={activeFace} size="lg" animated={mode === "herbert"} />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">AskHamiz</h2>
                <p className="truncate text-sm text-muted-foreground">{activeFace.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsAudioMuted((current) => !current)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                aria-label={isAudioMuted ? "Unmute AskHamiz face audio" : "Mute AskHamiz face audio"}
                title={isAudioMuted ? "Unmute face audio" : "Mute face audio"}
              >
                {isAudioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              {isBusy ? (
                <button
                  type="button"
                  onClick={stop}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                  aria-label="Stop response"
                >
                  <Minus className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                aria-label="Close AskHamiz"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-surface-muted/45 px-5 py-5">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-5 text-sm leading-6 text-muted-foreground">
                <div className="mb-3 flex items-center gap-2 text-foreground">
                  <Bot className="h-4 w-4" />
                  <span className="font-medium">AskHamiz</span>
                </div>
                Ask for a daily summary, create notes, inspect class dates, or upload a file directly here.
              </div>
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}
            {isBusy ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                AskHamiz is working
              </div>
            ) : null}
          </div>

          <div className="border-t border-border bg-surface p-4">
            {uploadStatus || error ? (
              <div className="mb-2 text-xs leading-5">
                {uploadStatus ? <p className="text-muted-foreground">{uploadStatus}</p> : null}
                {error ? <p className="text-danger">{error.message}</p> : null}
              </div>
            ) : null}
            <div className="mb-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                leadingIcon={<Sparkles className="h-4 w-4" />}
                onClick={() => sendAskHamizMessage("Give me my daily summary.")}
                disabled={isBusy}
                className="flex-1"
              >
                Daily summary
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                leadingIcon={<FileUp className="h-4 w-4" />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
              >
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (!file) {
                    return;
                  }

                  void handleUpload(file).catch((uploadError) => {
                    setUploadStatus(
                      uploadError instanceof Error ? uploadError.message : "Could not upload this file.",
                    );
                    setMode(null);
                    setInput("");
                  });
                }}
              />
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.currentTarget.value)}
                disabled={isBusy}
                placeholder="Ask Hamiz..."
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/80 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              />
              <Button
                type="submit"
                disabled={isBusy || input.trim().length === 0}
                aria-label="Send message"
                className="h-10 w-10 px-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        className="inline-flex h-16 items-center gap-3 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        aria-label="Open AskHamiz"
      >
        {isOpen ? (
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <MessageCircle className="h-4 w-4" />
          </span>
        ) : (
          <FaceAvatar face={activeFace} size="sm" />
        )}
        <span className="hidden sm:inline">AskHamiz</span>
      </button>
    </div>
  );
}
