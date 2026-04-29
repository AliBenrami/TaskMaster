"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Clock,
  Infinity,
  Loader2,
  Play,
  RotateCcw,
  XCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { cx } from "@/lib/utils";
import type { QuizDifficulty, QuizQuestion, QuizQuestionType } from "@/lib/quizzes/gemini";

type QuizMode = "infinite" | "exam";

type QuizNoteOption = {
  id: string;
  title: string;
  updatedAt: string;
  hasEmbedding: boolean;
};

type QuizEvaluation = {
  correct: boolean;
  score: number;
  feedback: string;
  idealAnswer: string;
};

type AnswerState = {
  answer: string;
  evaluation?: QuizEvaluation;
};

type QuizzesClientProps = {
  notes: QuizNoteOption[];
};

const questionTypeOptions: Array<{ value: QuizQuestionType; label: string }> = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "free_response", label: "Free response" },
  { value: "true_false", label: "True / false" },
];

const difficultyOptions: Array<{ value: QuizDifficulty; label: string }> = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload;
}

function MarkdownText({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  return (
    <div className={cx("quiz-markdown min-w-0 text-foreground", className)}>
      <ReactMarkdown
        rehypePlugins={[rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children, className: codeClassName }) => (
            <code
              className={cx(
                "rounded bg-surface-elevated px-1 py-0.5 font-mono text-[0.92em]",
                codeClassName,
              )}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border border-border bg-surface-muted p-3 text-sm">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-border pl-3 text-muted-foreground">{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-surface-muted px-2 py-1 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export function QuizzesClient({ notes }: QuizzesClientProps) {
  const embeddedNotes = useMemo(() => notes.filter((note) => note.hasEmbedding), [notes]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [mode, setMode] = useState<QuizMode>("infinite");
  const [timeMinutes, setTimeMinutes] = useState(20);
  const [questionCount, setQuestionCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState<QuizQuestionType[]>(["multiple_choice"]);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id]?.answer ?? "" : "";
  const currentEvaluation = currentQuestion ? answers[currentQuestion.id]?.evaluation : undefined;
  const examExpired = mode === "exam" && started && remainingSeconds <= 0;
  const canStart = selectedNoteIds.length > 0 && questionTypes.length > 0 && embeddedNotes.length > 0;
  const answeredCount = Object.values(answers).filter((answer) => answer.evaluation).length;
  const correctCount = Object.values(answers).filter((answer) => answer.evaluation?.correct).length;

  useEffect(() => {
    if (!started || finished || mode !== "exam" || remainingSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [finished, mode, remainingSeconds, started]);

  useEffect(() => {
    if (started && mode === "exam" && remainingSeconds === 0) {
      setFinished(true);
    }
  }, [mode, remainingSeconds, started]);

  function toggleNote(noteId: string) {
    setSelectedNoteIds((current) =>
      current.includes(noteId)
        ? current.filter((id) => id !== noteId)
        : [...current, noteId],
    );
  }

  function toggleQuestionType(type: QuizQuestionType) {
    setQuestionTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  }

  async function generateQuestions(count: number, append = false) {
    setError(null);
    setIsGenerating(true);
    try {
      const payload = await readJsonResponse<{ questions: QuizQuestion[] }>(
        await fetch("/api/quizzes/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteIds: selectedNoteIds,
            difficulty,
            questionTypes,
            count,
            previousPrompts: questions.map((question) => question.prompt),
          }),
        }),
      );

      setQuestions((current) => (append ? [...current, ...payload.questions] : payload.questions));
      if (!append) {
        setCurrentIndex(0);
      }
      return true;
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Quiz generation failed");
      return false;
    } finally {
      setIsGenerating(false);
    }
  }

  async function startQuiz() {
    setFinished(false);
    setAnswers({});
    setQuestions([]);
    setCurrentIndex(0);
    setRemainingSeconds(Math.max(1, timeMinutes) * 60);
    const generated = await generateQuestions(mode === "exam" ? questionCount : 1);
    setStarted(generated);
  }

  async function evaluateCurrentAnswer() {
    if (!currentQuestion || !currentAnswer.trim()) {
      return;
    }

    setError(null);
    setIsEvaluating(true);
    try {
      const payload = await readJsonResponse<{ evaluation: QuizEvaluation }>(
        await fetch("/api/quizzes/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: currentQuestion,
            answer: currentAnswer,
          }),
        }),
      );

      setAnswers((current) => ({
        ...current,
        [currentQuestion.id]: {
          answer: currentAnswer,
          evaluation: payload.evaluation,
        },
      }));
    } catch (evaluationError) {
      setError(evaluationError instanceof Error ? evaluationError.message : "Answer evaluation failed");
    } finally {
      setIsEvaluating(false);
    }
  }

  function updateAnswer(value: string) {
    if (!currentQuestion) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: {
        ...current[currentQuestion.id],
        answer: value,
      },
    }));
  }

  async function nextInfiniteQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    const generated = await generateQuestions(1, true);
    if (generated) {
      setCurrentIndex((index) => index + 1);
    }
  }

  function resetQuiz() {
    setStarted(false);
    setFinished(false);
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setRemainingSeconds(0);
    setError(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Quizzing"
        title="Quizzes"
        description="Create note-driven quizzes from stored note embeddings and content, then have Gemini evaluate each answer."
        actions={
          started ? (
            <Button type="button" variant="outline" leadingIcon={<RotateCcw className="size-4" />} onClick={resetQuiz}>
              Reset
            </Button>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-danger-soft px-4 py-3 text-sm text-danger dark:border-red-950/70">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Quiz setup</CardTitle>
            <CardDescription>Select notes, question format, difficulty, and quiz mode.</CardDescription>
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
                        disabled={!note.hasEmbedding || started}
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

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Mode</h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={started}
                  className={cx(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-60",
                    mode === "infinite"
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-surface text-muted-foreground hover:bg-surface-muted",
                  )}
                  onClick={() => setMode("infinite")}
                >
                  <Infinity className="size-4" />
                  Infinite
                </button>
                <button
                  type="button"
                  disabled={started}
                  className={cx(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-60",
                    mode === "exam"
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-surface text-muted-foreground hover:bg-surface-muted",
                  )}
                  onClick={() => setMode("exam")}
                >
                  <Clock className="size-4" />
                  Exam
                </button>
              </div>
            </section>

            {mode === "exam" ? (
              <section className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-sm font-medium text-foreground">
                  Time
                  <Input
                    type="number"
                    min={1}
                    max={240}
                    value={timeMinutes}
                    disabled={started}
                    onChange={(event) => setTimeMinutes(Number(event.target.value))}
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-foreground">
                  Questions
                  <Input
                    type="number"
                    min={1}
                    max={25}
                    value={questionCount}
                    disabled={started}
                    onChange={(event) => setQuestionCount(Number(event.target.value))}
                  />
                </label>
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Question types</h2>
              <div className="space-y-2">
                {questionTypeOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--accent)]"
                      checked={questionTypes.includes(option.value)}
                      disabled={started}
                      onChange={() => toggleQuestionType(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">Difficulty</h2>
              <div className="grid grid-cols-3 gap-2">
                {difficultyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={started}
                    className={cx(
                      "rounded-lg border px-3 py-2 text-sm font-medium capitalize transition disabled:opacity-60",
                      difficulty === option.value
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border bg-surface text-muted-foreground hover:bg-surface-muted",
                    )}
                    onClick={() => setDifficulty(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <Button
              type="button"
              className="w-full"
              disabled={!canStart || started || isGenerating}
              leadingIcon={isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              onClick={startQuiz}
            >
              Start quiz
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle>Question workspace</CardTitle>
              <CardDescription>
                {started
                  ? mode === "exam"
                    ? `${answeredCount}/${questions.length} answered`
                    : `${answeredCount} answered in this session`
                  : "Configure a quiz to begin."}
              </CardDescription>
            </div>
            {started ? (
              <div className="flex flex-wrap items-center gap-2">
                {mode === "exam" ? (
                  <Badge variant={examExpired ? "neutral" : "accent"}>
                    <Clock className="size-3.5" />
                    {formatTimer(remainingSeconds)}
                  </Badge>
                ) : (
                  <Badge variant="accent">
                    <Infinity className="size-3.5" />
                    Infinite
                  </Badge>
                )}
                <Badge variant="outline">{difficulty}</Badge>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {!started ? (
              <div className="flex min-h-96 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-muted px-6 text-center">
                <Brain className="size-10 text-muted-foreground" />
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">Ready when your notes are selected</h2>
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    Generated questions use the embeddings stored on the selected note rows, plus their readable note content.
                  </p>
                </div>
              </div>
            ) : isGenerating && questions.length === 0 ? (
              <div className="flex min-h-96 items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Generating questions with Gemini
              </div>
            ) : finished ? (
              <div className="flex min-h-96 flex-col justify-center gap-5">
                <div className="space-y-2 text-center">
                  <h2 className="text-xl font-semibold text-foreground">Exam complete</h2>
                  <p className="text-sm text-muted-foreground">
                    Score: {correctCount}/{answeredCount || questions.length} correct
                  </p>
                </div>
                <div className="grid gap-2">
                  {questions.map((question, index) => {
                    const evaluation = answers[question.id]?.evaluation;
                    return (
                      <button
                        key={question.id}
                        type="button"
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-surface-muted"
                        onClick={() => {
                          setFinished(false);
                          setCurrentIndex(index);
                        }}
                      >
                        <MarkdownText markdown={question.prompt} className="truncate text-sm" />
                        {evaluation ? (
                          evaluation.correct ? (
                            <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                          ) : (
                            <XCircle className="size-4 shrink-0 text-danger" />
                          )
                        ) : (
                          <Badge variant="outline">Unanswered</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : currentQuestion ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">Question {currentIndex + 1}</Badge>
                  <Badge variant="outline">{currentQuestion.type.replace("_", " ")}</Badge>
                  {currentQuestion.sourceNoteTitles.map((title) => (
                    <Badge key={title} variant="neutral">
                      {title}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-3">
                  <MarkdownText
                    markdown={currentQuestion.prompt}
                    className="space-y-3 text-xl font-semibold leading-8"
                  />
                  {currentQuestion.type === "multiple_choice" || currentQuestion.type === "true_false" ? (
                    <div className="grid gap-2">
                      {(currentQuestion.choices ?? []).map((choice) => (
                        <label
                          key={choice}
                          className={cx(
                            "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-3 text-sm transition hover:bg-surface-muted",
                            currentAnswer === choice ? "border-accent bg-accent-soft text-accent" : "text-foreground",
                          )}
                        >
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            className="size-4 accent-[var(--accent)]"
                            checked={currentAnswer === choice}
                            disabled={Boolean(currentEvaluation) || examExpired}
                            onChange={() => updateAnswer(choice)}
                          />
                          <MarkdownText markdown={choice} className="text-sm" />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Textarea
                      value={currentAnswer}
                      disabled={Boolean(currentEvaluation) || examExpired}
                      placeholder="Type your answer..."
                      rows={7}
                      onChange={(event) => updateAnswer(event.target.value)}
                    />
                  )}
                </div>

                {currentEvaluation ? (
                  <div
                    className={cx(
                      "rounded-lg border px-4 py-3 text-sm leading-6",
                      currentEvaluation.correct
                        ? "border-green-200 bg-green-50 text-green-800 dark:border-green-950/70 dark:bg-green-950/20 dark:text-green-200"
                        : "border-red-200 bg-danger-soft text-danger dark:border-red-950/70",
                    )}
                  >
                    <div className="font-medium">
                      {currentEvaluation.correct ? "Correct" : "Needs work"} · Score{" "}
                      {Math.round(currentEvaluation.score * 100)}%
                    </div>
                    <MarkdownText markdown={currentEvaluation.feedback} className="mt-1 space-y-2" />
                    <div className="mt-2 space-y-1">
                      <div className="font-medium">Ideal answer:</div>
                      <MarkdownText markdown={currentEvaluation.idealAnswer} className="space-y-2" />
                    </div>
                  </div>
                ) : examExpired ? (
                  <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
                    Exam time has ended.
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {mode === "exam" ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={currentIndex === 0}
                          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={currentIndex >= questions.length - 1}
                          onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))}
                        >
                          Next
                        </Button>
                      </>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!currentAnswer.trim() || Boolean(currentEvaluation) || isEvaluating || examExpired}
                      leadingIcon={isEvaluating ? <Loader2 className="size-4 animate-spin" /> : undefined}
                      onClick={evaluateCurrentAnswer}
                    >
                      Check answer
                    </Button>
                    {mode === "infinite" ? (
                      <Button
                        type="button"
                        disabled={!currentEvaluation || isGenerating}
                        leadingIcon={isGenerating ? <Loader2 className="size-4 animate-spin" /> : undefined}
                        onClick={nextInfiniteQuestion}
                      >
                        Next question
                      </Button>
                    ) : (
                      <Button type="button" onClick={() => setFinished(true)}>
                        Finish exam
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
