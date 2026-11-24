import { S3Client } from "@aws-sdk/client-s3";
import { createArchiveRaw } from "./archiveRaw.js";
import {
  createIngestDependencies,
  createPool,
  resolveDatabaseUrl,
} from "./deps.js";
import { runIngest } from "./runIngest.js";

export type IngestHandlerEvent = {
  limit?: number;
  pageSize?: number;
};

/**
 * AWS Lambda entry point used by EventBridge (and by a manual invoke).
 * It is the same `runIngest` core as the local CLI, with an optional
 * `archiveRaw` hook that writes each openFDA page to S3.
 */
export async function handler(
  event: IngestHandlerEvent = {},
): Promise<{
  ok: true;
  requested: number;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  pages: number;
}> {
  const pool = createPool(await resolveDatabaseUrl());
  try {
    const bucket = process.env.ARCHIVE_BUCKET;
    const archiveRaw = bucket
      ? createArchiveRaw({
          client: new S3Client({}),
          bucket,
          prefix: process.env.ARCHIVE_PREFIX ?? "ingest/",
        })
      : undefined;

    const limit = event.limit ?? Number(process.env.INGEST_LIMIT ?? 200);
    const result = await runIngest(
      { total: limit, pageSize: event.pageSize },
      createIngestDependencies(pool, { archiveRaw }),
    );
    return { ok: true, ...result };
  } finally {
    await pool.end();
  }
}
