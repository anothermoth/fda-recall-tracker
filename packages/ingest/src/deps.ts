import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { fetchOpenFdaPage } from "./openFda.js";
import type { IngestDependencies } from "./types.js";
import { upsertRecalls } from "./upsert.js";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
config({ path: path.join(rootDir, ".env") });

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  return url;
}

export function createPool(connectionString = getDatabaseUrl()): pg.Pool {
  return new pg.Pool({ connectionString });
}

export function createLocalDependencies(pool: pg.Pool): IngestDependencies {
  return {
    fetchPage: (params) => fetchOpenFdaPage(params),
    upsertRecalls: (rows) => upsertRecalls(pool, rows),
  };
}
