import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { vectorService } from "@/lib/vector";

type Row = Record<string, unknown>;

async function exec(query: ReturnType<typeof sql>): Promise<Row[]> {
  const result = await db.execute(query);
  return ((result as { rows?: Row[] }).rows ?? (result as Row[])) as Row[];
}

async function main() {
  const rows = (await exec(
    sql`SELECT id,
               user_id,
               title,
               (content -> 'noteGeneration' ->> 'topicTitle') AS topic_title,
               (content -> 'noteGeneration' ->> 'markdown') AS markdown,
               (content -> 'noteGeneration' -> 'embedding') AS embedding,
               (content -> 'noteGeneration' ->> 'fileName') AS file_name,
               (content -> 'noteGeneration' ->> 'topicIndex')::int AS topic_index,
               (content -> 'noteGeneration' ->> 'topicCount')::int AS topic_count
        FROM note
        WHERE content -> 'noteGeneration' -> 'embedding' IS NOT NULL`,
  )) as Array<{
    id: string;
    user_id: string;
    title: string;
    topic_title: string;
    markdown: string;
    embedding: number[];
    file_name: string | null;
    topic_index: number | null;
    topic_count: number | null;
  }>;

  console.log(`Found ${rows.length} note(s) with stored embeddings.`);

  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const content = `${row.topic_title}\n\n${row.markdown}`;
    const result = await vectorService.ingest({
      userId: row.user_id,
      sourceType: "note",
      sourceId: row.id,
      chunks: [
        {
          content,
          embedding: row.embedding,
          metadata: {
            title: row.topic_title,
            fileName: row.file_name ?? undefined,
            topicIndex: row.topic_index ?? 0,
            topicCount: row.topic_count ?? 1,
            backfilled: true,
          },
        },
      ],
    });
    inserted += result.inserted.length;
    skipped += result.skipped.length;
    console.log(
      `  note=${row.id}  inserted=${result.inserted.length}  skipped=${result.skipped.length}`,
    );
  }

  console.log(`\nDone. inserted=${inserted}  skipped=${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
