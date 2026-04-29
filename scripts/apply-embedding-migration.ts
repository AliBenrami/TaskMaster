import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  const sqlPath = path.resolve("./drizzle/0007_add_embeddings.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const statements = sql
    .split("--> statement-breakpoint")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const statement of statements) {
      console.log("--", statement.split("\n")[0]);
      await client.query(statement);
    }
    await client.query("COMMIT");
    console.log("\nAll statements applied successfully.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
