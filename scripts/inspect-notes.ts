import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

type Row = Record<string, unknown>;

async function exec(query: ReturnType<typeof sql>): Promise<Row[]> {
  const result = await db.execute(query);
  return ((result as { rows?: Row[] }).rows ?? (result as Row[])) as Row[];
}

async function main() {
  const totals = await exec(
    sql`SELECT user_id,
               source_type,
               COUNT(*)::int AS n,
               COUNT(content -> 'noteGeneration' -> 'embedding')::int AS with_embedding
        FROM note
        GROUP BY user_id, source_type
        ORDER BY n DESC`,
  );
  console.log("notes by (user_id, source_type):");
  for (const row of totals) {
    console.log(
      `  user=${row.user_id}  source=${row.source_type}  n=${row.n}  with_embedding=${row.with_embedding}`,
    );
  }

  const sample = await exec(
    sql`SELECT id, title, user_id,
               jsonb_array_length((content -> 'noteGeneration' -> 'embedding')) AS dim
        FROM note
        WHERE content -> 'noteGeneration' -> 'embedding' IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 5`,
  );
  console.log("\nrecent notes with embeddings:");
  for (const row of sample) {
    console.log(
      `  id=${row.id}  user=${row.user_id}  dim=${row.dim}  title=${row.title}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
