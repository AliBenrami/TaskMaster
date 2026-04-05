import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DatabaseDriver = "neon-http" | "pg";

const DEFAULT_DRIVER: DatabaseDriver = "neon-http";
const dbDriver: DatabaseDriver =
  process.env.DB_DRIVER === "pg" ? "pg" : DEFAULT_DRIVER;
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/taskmaster";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL is required in production.");
}

const createDb = () => {
  if (dbDriver === "pg") {
    const pool = new Pool({ connectionString: databaseUrl });
    return drizzleNodePg({ client: pool, schema });
  }

  const client = neon(databaseUrl);
  return drizzleNeonHttp({ client, schema });
};

export const db = createDb();
export { dbDriver, schema };
