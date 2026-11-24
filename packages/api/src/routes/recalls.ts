import { Router } from "express";
import type { Pool } from "pg";
import { asyncHandler } from "../asyncHandler.js";
import { RECALL_COLUMNS, type RecallListQuery } from "../types.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseDate(value: unknown, name: string): string | undefined {
  const text = parseOptionalString(value);
  if (!text) {
    return undefined;
  }
  if (!DATE_RE.test(text)) {
    throw badRequest(`${name} must be a YYYY-MM-DD date`);
  }
  return text;
}

function parseInteger(
  value: unknown,
  name: string,
  fallback: number,
  min: number,
  max?: number,
): number {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw badRequest(`${name} must be an integer`);
  }
  if (n < min || (max !== undefined && n > max)) {
    const range = max === undefined ? `${min} or greater` : `${min} to ${max}`;
    throw badRequest(`${name} must be ${range}`);
  }
  return n;
}

function badRequest(message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = 400;
  return error;
}

export function parseRecallListQuery(query: RequestQuery): RecallListQuery {
  return {
    q: parseOptionalString(query.q),
    classification: parseOptionalString(query.classification),
    state: parseOptionalString(query.state),
    from: parseDate(query.from, "from"),
    to: parseDate(query.to, "to"),
    limit: parseInteger(query.limit, "limit", DEFAULT_LIMIT, 1, MAX_LIMIT),
    offset: parseInteger(query.offset, "offset", 0, 0),
  };
}

type RequestQuery = Record<string, unknown>;

export function recallsRouter(pool: Pool): Router {
  const router = Router();

  router.get(
    "/recalls",
    asyncHandler(async (req, res) => {
      const filters = parseRecallListQuery(req.query as RequestQuery);
      const { rows, total } = await listRecalls(pool, filters);
      res.json({
        data: rows,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total,
        },
      });
    }),
  );

  router.get(
    "/recalls/:recallNumber",
    asyncHandler(async (req, res) => {
      const recallNumber = req.params.recallNumber ?? "";
      const result = await pool.query(
        `SELECT ${RECALL_COLUMNS}, raw
         FROM recalls
         WHERE recall_number = $1`,
        [recallNumber],
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Recall not found" });
        return;
      }

      res.json({ data: formatRecall(result.rows[0], true) });
    }),
  );

  return router;
}

export async function listRecalls(pool: Pool, filters: RecallListQuery) {
  const params: unknown[] = [
    filters.q ?? null,
    filters.classification ?? null,
    filters.state ?? null,
    filters.from ?? null,
    filters.to ?? null,
  ];

  const where = `
    WHERE ($1::text IS NULL OR search_tsv @@ plainto_tsquery('english', $1))
      AND ($2::text IS NULL OR classification = $2)
      AND ($3::text IS NULL OR state = $3)
      AND ($4::date IS NULL OR report_date >= $4)
      AND ($5::date IS NULL OR report_date <= $5)
  `;

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM recalls ${where}`,
    params,
  );

  const listParams = [...params, filters.limit, filters.offset];
  const listResult = await pool.query(
    `SELECT ${RECALL_COLUMNS}
     FROM recalls
     ${where}
     ORDER BY report_date DESC NULLS LAST, recall_number
     LIMIT $6 OFFSET $7`,
    listParams,
  );

  return {
    rows: listResult.rows.map((row) => formatRecall(row, false)),
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

function formatRecall(
  row: Record<string, unknown>,
  includeRaw: boolean,
): Record<string, unknown> {
  const record: Record<string, unknown> = {
    recall_number: row.recall_number,
    status: row.status,
    classification: row.classification,
    product_description: row.product_description,
    reason_for_recall: row.reason_for_recall,
    recalling_firm: row.recalling_firm,
    city: row.city,
    state: row.state,
    country: row.country,
    recall_initiation_date: formatDate(row.recall_initiation_date),
    report_date: formatDate(row.report_date),
    distribution_pattern: row.distribution_pattern,
    created_at: formatTimestamp(row.created_at),
    updated_at: formatTimestamp(row.updated_at),
  };
  if (includeRaw) {
    record.raw = row.raw;
  }
  return record;
}

function formatDate(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return null;
}

function formatTimestamp(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
}
