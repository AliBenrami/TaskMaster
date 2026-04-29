"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Hit = {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
};

type ApiResponse = {
  query: {
    queryText: string;
    sourceType?: string;
    sourceId?: string;
    topK: number;
    minScore?: number;
  };
  count: number;
  hits: Hit[];
};

type Props = {
  displayName: string;
};

export function VectorSearchClient({ displayName }: Props) {
  const [queryText, setQueryText] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [topK, setTopK] = useState(8);
  const [minScore, setMinScore] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!queryText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const trimmedSourceType = sourceType.trim();
      const trimmedMinScore = minScore.trim();
      const body: Record<string, unknown> = {
        queryText: queryText.trim(),
        topK,
      };
      if (trimmedSourceType) body.sourceType = trimmedSourceType;
      if (trimmedMinScore !== "") {
        const parsed = Number(trimmedMinScore);
        if (Number.isFinite(parsed)) body.minScore = parsed;
      }

      const res = await fetch("/api/vector/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as ApiResponse | { error?: string };
      if (!res.ok) {
        throw new Error(
          ("error" in data && data.error) ||
            `Request failed (${res.status})`,
        );
      }

      setResponse(data as ApiResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Vector search
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Embed a query through the vector service and inspect the
            top-K matching chunks. Signed in as {displayName}.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
        >
          Home
        </Link>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Query
        </label>
        <textarea
          data-testid="vector-search-query"
          value={queryText}
          onChange={(event) => setQueryText(event.target.value)}
          placeholder="What would you like to find?"
          rows={3}
          className="mt-1 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Source type (optional)
            </label>
            <input
              data-testid="vector-search-source-type"
              type="text"
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value)}
              placeholder="note"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Top K
            </label>
            <input
              data-testid="vector-search-topk"
              type="number"
              min={1}
              max={50}
              value={topK}
              onChange={(event) => setTopK(Number(event.target.value) || 1)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Min score (optional)
            </label>
            <input
              data-testid="vector-search-min-score"
              type="number"
              step="0.01"
              min={-1}
              max={1}
              value={minScore}
              onChange={(event) => setMinScore(event.target.value)}
              placeholder="0.7"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="submit"
            data-testid="vector-search-submit"
            disabled={loading || !queryText.trim()}
            className="inline-flex rounded-full border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {error ? (
        <p
          data-testid="vector-search-error"
          className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}

      {response ? (
        <section className="mt-6">
          <header className="mb-3 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
            <span data-testid="vector-search-summary">
              {response.count} hit{response.count === 1 ? "" : "s"} for{" "}
              <span className="font-mono text-zinc-900 dark:text-zinc-100">
                &ldquo;{response.query.queryText}&rdquo;
              </span>
            </span>
            <span className="font-mono text-xs">
              topK {response.query.topK}
              {response.query.sourceType
                ? ` · sourceType ${response.query.sourceType}`
                : ""}
              {response.query.minScore !== undefined
                ? ` · minScore ${response.query.minScore}`
                : ""}
            </span>
          </header>

          {response.hits.length === 0 ? (
            <p
              data-testid="vector-search-empty"
              className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              No matches. Ingest some content first or try a different query.
            </p>
          ) : (
            <ul
              data-testid="vector-search-results"
              className="space-y-3"
            >
              {response.hits.map((hit, index) => (
                <li
                  key={hit.id}
                  data-testid="vector-search-result"
                  className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 font-mono text-white dark:bg-zinc-100 dark:text-zinc-900">
                      #{index + 1}
                    </span>
                    <span
                      data-testid="vector-search-result-score"
                      className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                    >
                      score {hit.score.toFixed(4)}
                    </span>
                    <span className="font-mono">
                      {hit.sourceType} · {hit.sourceId} · chunk{" "}
                      {hit.chunkIndex}
                    </span>
                  </div>

                  <pre
                    data-testid="vector-search-result-content"
                    className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {hit.content}
                  </pre>

                  {Object.keys(hit.metadata ?? {}).length > 0 ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-zinc-500 dark:text-zinc-400">
                        Metadata
                      </summary>
                      <pre className="mt-2 overflow-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {JSON.stringify(hit.metadata, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
