"use client";

import { useMemo, useState } from "react";
import { Brain, ChevronLeft, ChevronRight, Layers3, Loader2, Play, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { cx } from "@/lib/utils";
import type { FlashcardDeck } from "@/lib/flashcards/types";

type FlashcardNoteOption = {
  id: string;
  title: string;
  hasEmbedding: boolean;
};

type FlashcardsClientProps = {
  notes: FlashcardNoteOption[];
  initialDecks: FlashcardDeck[];
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload;
}

function MarkdownText({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div className={cx("min-w-0 space-y-2 text-foreground", className)}>
      <ReactMarkdown
        rehypePlugins={[rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
          code: ({ children }) => (
            <code className="rounded bg-surface-elevated px-1 py-0.5 font-mono text-[0.92em]">
              {children}
            </code>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export function FlashcardsClient({ notes, initialDecks }: FlashcardsClientProps) {
  const embeddedNotes = useMemo(() => notes.filter((note) => note.hasEmbedding), [notes]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [cardCount, setCardCount] = useState(16);
  const [decks, setDecks] = useState<FlashcardDeck[]>(initialDecks);
  const [activeDeckId, setActiveDeckId] = useState(initialDecks[0]?.id ?? "");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDeck = decks.find((deck) => deck.id === activeDeckId) ?? decks[0];
  const activeCard = activeDeck?.cards[activeCardIndex];
  const canGenerate = selectedNoteIds.length > 0 && embeddedNotes.length > 0 && !isGenerating;

  function toggleNote(noteId: string) {
    setSelectedNoteIds((current) =>
      current.includes(noteId)
        ? current.filter((id) => id !== noteId)
        : [...current, noteId],
    );
  }

  function selectDeck(deckId: string) {
    setActiveDeckId(deckId);
    setActiveCardIndex(0);
    setShowBack(false);
  }

  function goToCard(index: number) {
    if (!activeDeck) {
      return;
    }

    setActiveCardIndex(Math.min(Math.max(index, 0), activeDeck.cards.length - 1));
    setShowBack(false);
  }

  async function createDeck() {
    setError(null);
    setIsGenerating(true);
    try {
      const payload = await readJsonResponse<{ deck: FlashcardDeck }>(
        await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteIds: selectedNoteIds,
            cardCount,
          }),
        }),
      );

      setDecks((current) => [payload.deck, ...current]);
      setActiveDeckId(payload.deck.id);
      setActiveCardIndex(0);
      setShowBack(false);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Flashcard generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Flashcards"
        title="Flashcards"
        description="Generate persistent flashcard decks from selected notes using stored embeddings and note content."
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-danger-soft px-4 py-3 text-sm text-danger dark:border-red-950/70">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Create deck</CardTitle>
            <CardDescription>Select notes with embeddings and choose how many cards to generate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-foreground">Notes</h2>
                <Badge variant="outline">{selectedNoteIds.length} selected</Badge>
              </div>
              <div className="max-h-72 space-y-2 overflow-auto pr-1">
                {notes.length === 0 ? (
                  <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
                    Create or upload notes first.
                  </p>
                ) : (
                  notes.map((note) => (
                    <label
                      key={note.id}
                      className={cx(
                        "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface px-3 py-3 text-sm transition",
                        note.hasEmbedding
                          ? "hover:border-border-strong hover:bg-surface-muted"
                          : "cursor-not-allowed opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-[var(--accent)]"
                        checked={selectedNoteIds.includes(note.id)}
                        disabled={!note.hasEmbedding || isGenerating}
                        onChange={() => toggleNote(note.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">{note.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {note.hasEmbedding ? "Embedding ready" : "No embedding stored"}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </section>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Cards
              <Input
                type="number"
                min={4}
                max={40}
                value={cardCount}
                disabled={isGenerating}
                onChange={(event) => setCardCount(Number(event.target.value))}
              />
            </label>

            <Button
              type="button"
              className="w-full"
              disabled={!canGenerate}
              leadingIcon={isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              onClick={createDeck}
            >
              Generate deck
            </Button>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Saved decks</h2>
              <div className="space-y-2">
                {decks.length === 0 ? (
                  <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
                    Generated decks will appear here.
                  </p>
                ) : (
                  decks.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      className={cx(
                        "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm transition",
                        activeDeck?.id === deck.id
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border bg-surface text-foreground hover:bg-surface-muted",
                      )}
                      onClick={() => selectDeck(deck.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{deck.title}</span>
                        <span className="text-xs text-muted-foreground">{deck.cardCount} cards</span>
                      </span>
                      <Layers3 className="size-4 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle>{activeDeck?.title ?? "Deck workspace"}</CardTitle>
              <CardDescription>
                {activeDeck ? `${activeCardIndex + 1}/${activeDeck.cards.length} cards` : "Generate a deck to begin."}
              </CardDescription>
            </div>
            {activeDeck ? <Badge variant="outline">{activeDeck.cardCount} cards</Badge> : null}
          </CardHeader>
          <CardContent>
            {isGenerating && !activeDeck ? (
              <div className="flex min-h-96 items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Generating flashcards with Gemini
              </div>
            ) : activeCard ? (
              <div className="space-y-5">
                <button
                  type="button"
                  className="flex min-h-96 w-full flex-col justify-between rounded-lg border border-border bg-surface-muted p-6 text-left transition hover:border-border-strong"
                  onClick={() => setShowBack((value) => !value)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="accent">{showBack ? "Back" : "Front"}</Badge>
                    <Badge variant="outline">Tap to flip</Badge>
                  </div>
                  <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center py-8">
                    <MarkdownText
                      markdown={showBack ? activeCard.back : activeCard.front}
                      className="text-center text-xl font-medium leading-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeCard.sourceNoteTitles.map((title) => (
                      <Badge key={title} variant="neutral">
                        {title}
                      </Badge>
                    ))}
                  </div>
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={activeCardIndex === 0}
                    leadingIcon={<ChevronLeft className="size-4" />}
                    onClick={() => goToCard(activeCardIndex - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    leadingIcon={<RotateCcw className="size-4" />}
                    onClick={() => setShowBack((value) => !value)}
                  >
                    Flip
                  </Button>
                  <Button
                    type="button"
                    disabled={!activeDeck || activeCardIndex >= activeDeck.cards.length - 1}
                    leadingIcon={<ChevronRight className="size-4" />}
                    onClick={() => goToCard(activeCardIndex + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-muted px-6 text-center">
                <Brain className="size-10 text-muted-foreground" />
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">No deck selected</h2>
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    Select notes with embeddings and generate a deck to review front/back flashcards.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
