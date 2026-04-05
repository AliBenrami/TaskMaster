import { existsSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env")) {
  loadEnv({ path: ".env" });
}

if (existsSync(".env.local")) {
  loadEnv({ path: ".env.local", override: true });
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/taskmaster",
  },
});
