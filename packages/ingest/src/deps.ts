import pg from "pg";
import { fetchOpenFdaPage } from "./openFda.js";
import { resolveDatabaseUrl } from "./databaseUrl.js";
import type { IngestDependencies } from "./types.js";
import { upsertRecalls } from "./upsert.js";

export { resolveDatabaseUrl };

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: 4 });
}

export function createIngestDependencies(
  pool: pg.Pool,
  options: Pick<IngestDependencies, "archiveRaw"> = {},
): IngestDependencies {
  return {
    fetchPage: (params) => fetchOpenFdaPage(params),
    upsertRecalls: (rows) => upsertRecalls(pool, rows),
    archiveRaw: options.archiveRaw,
  };
}

/** Local CLI dependencies: fetch + upsert, no S3 archive. */
export function createLocalDependencies(pool: pg.Pool): IngestDependencies {
  return createIngestDependencies(pool);
}

export async function createPoolFromEnv(): Promise<pg.Pool> {
  return createPool(await resolveDatabaseUrl());
}
