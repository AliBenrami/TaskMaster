import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new Pool({ connectionString: url });
  const dbForMigrate = drizzle(pool);

  console.log("Applying migrations from ./drizzle ...");
  await migrate(dbForMigrate, { migrationsFolder: "./drizzle" });
  console.log("Done.");

  await pool.end();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
