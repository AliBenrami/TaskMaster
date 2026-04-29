import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

type Row = Record<string, unknown>;

async function exec(query: ReturnType<typeof sql>): Promise<Row[]> {
  const result = await db.execute(query);
  return ((result as { rows?: Row[] }).rows ?? (result as Row[])) as Row[];
}

async function main() {
  const ext = await exec(
    sql`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`,
  );
  console.log("vector extension:", ext);

  const tableExists = await exec(
    sql`SELECT to_regclass('public.embedding')::text AS name`,
  );
  console.log("embedding table:", tableExists[0]?.name ?? "(missing)");

  try {
    const migrations = await exec(
      sql`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id`,
    );
    console.log("applied migrations:");
    for (const row of migrations) {
      console.log(
        `  id=${row.id}  created_at=${row.created_at}  hash=${row.hash}`,
      );
    }
  } catch (error) {
    console.log(
      "could not read drizzle.__drizzle_migrations:",
      error instanceof Error ? error.message : error,
    );
  }

  if (tableExists[0]?.name) {
    const counts = await exec(
      sql`SELECT user_id, source_type, COUNT(*)::int AS n
          FROM embedding
          GROUP BY user_id, source_type
          ORDER BY n DESC`,
    );
    console.log("rows by (user_id, source_type):");
    if (counts.length === 0) {
      console.log("  (none)");
    } else {
      for (const row of counts) {
        console.log(`  ${row.user_id}  ${row.source_type}  ${row.n}`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
