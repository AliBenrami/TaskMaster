import type { DoclingComparisonSummary } from "@/lib/docling-test/contracts";

export function ComparisonPanel({ comparison }: { comparison: DoclingComparisonSummary | null }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        Comparison
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        ParseTest side-by-side summary
      </h2>

      {!comparison ? (
        <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          No saved docling-test preview yet, so comparison data is unavailable.
        </p>
      ) : comparison.availability !== "matched" ? (
        <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{comparison.reason}</p>
      ) : (
        <>
          <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {comparison.reason} Matching parse-test run:{" "}
            <span className="font-mono text-xs">{comparison.parseTestRunId}</span>
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Section</th>
                  <th className="pb-3 pr-4 font-medium">Docling</th>
                  <th className="pb-3 pr-4 font-medium">ParseTest</th>
                  <th className="pb-3 font-medium">Delta</th>
                </tr>
              </thead>
              <tbody>
                {comparison.counts.map((row) => (
                  <tr key={row.label} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-100">{row.label}</td>
                    <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">{row.docling}</td>
                    <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">{row.parseTest}</td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {row.delta > 0 ? `+${row.delta}` : row.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
