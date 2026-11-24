import { afterAll, describe, expect, it } from "vitest";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { runIngest } from "../src/runIngest.ts";
import { upsertRecalls } from "../src/upsert.ts";
import type { OpenFdaPage, OpenFdaRecall } from "../src/types.ts";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
config({ path: path.join(rootDir, ".env") });

const databaseUrl = process.env.DATABASE_URL;
const hasDatabase = Boolean(databaseUrl);

describe.skipIf(!hasDatabase)("ingest upsert (Postgres)", () => {
  const pool = new pg.Pool({ connectionString: databaseUrl });

  afterAll(async () => {
    await pool.end();
  });

  it("upserts on recall_number and updates existing rows", async () => {
    const prefix = `TEST-${Date.now()}-`;
    const first: OpenFdaRecall = {
      recall_number: `${prefix}1`,
      status: "Ongoing",
      classification: "Class II",
      product_description: "Test tablet",
      reason_for_recall: "Contamination",
      state: "IL",
      report_date: "20260301",
    };
    const updated: OpenFdaRecall = {
      ...first,
      status: "Terminated",
      reason_for_recall: "Contamination — updated",
    };

    const pages: OpenFdaRecall[][] = [[first], [updated]];
    let calls = 0;
    const fetchPage = async (): Promise<OpenFdaPage> => {
      const results = pages[calls] ?? [];
      calls += 1;
      return { results };
    };

    try {
      const firstRun = await runIngest(
        { total: 1, pageSize: 1 },
        { fetchPage, upsertRecalls: (rows) => upsertRecalls(pool, rows) },
      );
      expect(firstRun.inserted).toBe(1);
      expect(firstRun.updated).toBe(0);

      const secondRun = await runIngest(
        { total: 1, pageSize: 1 },
        { fetchPage, upsertRecalls: (rows) => upsertRecalls(pool, rows) },
      );
      expect(secondRun.inserted).toBe(0);
      expect(secondRun.updated).toBe(1);

      const stored = await pool.query(
        "SELECT status, reason_for_recall FROM recalls WHERE recall_number = $1",
        [`${prefix}1`],
      );
      expect(stored.rows[0]?.status).toBe("Terminated");
      expect(stored.rows[0]?.reason_for_recall).toBe("Contamination — updated");
    } finally {
      await pool.query("DELETE FROM recalls WHERE recall_number LIKE $1", [
        `${prefix}%`,
      ]);
    }
  });
});

describe.skipIf(hasDatabase)("ingest upsert (no DATABASE_URL)", () => {
  it("skips integration tests when Postgres is not configured", () => {
    expect(hasDatabase).toBe(false);
  });
});
