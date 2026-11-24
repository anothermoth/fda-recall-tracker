import { createLocalDependencies, createPool } from "./deps.js";
import { runIngest } from "./runIngest.js";

export type IngestHandlerEvent = {
  limit?: number;
  pageSize?: number;
};

/**
 * Future AWS Lambda entry point.
 *
 * Step 1 reuses the same `runIngest` core as the local CLI and talks
 * to Postgres through DATABASE_URL. A later step will:
 *   - attach an `archiveRaw` implementation that writes each page to S3
 *   - swap the pool for a Lambda-friendly connection strategy
 *   - wire this file up as the function handler
 *
 * Do not add AWS SDK usage here yet.
 */
export async function handler(
  event: IngestHandlerEvent = {},
): Promise<{ ok: true; requested: number; fetched: number; inserted: number; updated: number; skipped: number; pages: number }> {
  const pool = createPool();
  try {
    const result = await runIngest(
      { total: event.limit ?? 100, pageSize: event.pageSize },
      createLocalDependencies(pool),
    );
    return { ok: true, ...result };
  } finally {
    await pool.end();
  }
}
