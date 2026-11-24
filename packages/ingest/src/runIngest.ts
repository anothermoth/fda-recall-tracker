import { mapRecalls } from "./mapRecall.js";
import type { IngestDependencies, IngestOptions, IngestResult } from "./types.js";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

/**
 * Fetch the most recent `total` openFDA enforcement records, map them,
 * optionally archive the raw page, and upsert into Postgres.
 *
 * This function has no I/O of its own. The CLI and the future Lambda
 * handler each supply their own `deps` (HTTP, database, S3).
 */
export async function runIngest(
  options: IngestOptions,
  deps: IngestDependencies,
): Promise<IngestResult> {
  if (!Number.isInteger(options.total) || options.total <= 0) {
    throw new Error("total must be a positive integer");
  }

  const pageSize = Math.min(
    Math.max(options.pageSize ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );

  const result: IngestResult = {
    requested: options.total,
    fetched: 0,
    skipped: 0,
    inserted: 0,
    updated: 0,
    pages: 0,
  };

  let skip = 0;
  while (result.fetched + result.skipped < options.total) {
    const remaining = options.total - (result.fetched + result.skipped);
    const limit = Math.min(pageSize, remaining);
    const page = await deps.fetchPage({ skip, limit });
    result.pages += 1;

    if (deps.archiveRaw) {
      await deps.archiveRaw(page, { skip, limit });
    }

    const records = page.results ?? [];
    if (records.length === 0) {
      break;
    }

    const { rows, skipped } = mapRecalls(records);
    result.fetched += rows.length;
    result.skipped += skipped;

    if (rows.length > 0) {
      const upserted = await deps.upsertRecalls(rows);
      result.inserted += upserted.inserted;
      result.updated += upserted.updated;
    }

    if (records.length < limit) {
      break;
    }
    skip += records.length;
  }

  return result;
}
