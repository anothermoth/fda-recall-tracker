import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.ts";
import {
  createTestPool,
  databaseUrl,
  readonlyUrl,
  resetAndSeed,
} from "./helpers.ts";

const hasDatabase = Boolean(databaseUrl);

describe.skipIf(!hasDatabase)("API (Postgres)", () => {
  const pool = createTestPool(databaseUrl!);
  const app = createApp(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1 FROM recalls LIMIT 1");
  });

  beforeEach(async () => {
    await resetAndSeed(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("GET /health returns ok when the database is reachable", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("GET /recalls returns paginated recalls newest first", async () => {
    const response = await request(app).get("/recalls");
    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      limit: 20,
      offset: 0,
      total: 3,
    });
    expect(response.body.data.map((row: { recall_number: string }) => row.recall_number)).toEqual([
      "D-0002-2026",
      "D-0001-2026",
      "D-0003-2026",
    ]);
    expect(response.body.data[0]).not.toHaveProperty("raw");
  });

  it("filters by classification and state", async () => {
    const byClass = await request(app).get("/recalls").query({ classification: "Class I" });
    expect(byClass.body.data).toHaveLength(1);
    expect(byClass.body.data[0].recall_number).toBe("D-0001-2026");

    const byState = await request(app).get("/recalls").query({ state: "TX" });
    expect(byState.body.pagination.total).toBe(2);
    expect(byState.body.data.map((row: { recall_number: string }) => row.recall_number)).toEqual([
      "D-0002-2026",
      "D-0003-2026",
    ]);
  });

  it("filters by report_date range", async () => {
    const response = await request(app).get("/recalls").query({
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].recall_number).toBe("D-0001-2026");
  });

  it("performs full-text search across product and reason", async () => {
    const byProduct = await request(app).get("/recalls").query({ q: "ibuprofen" });
    expect(byProduct.body.data).toHaveLength(1);
    expect(byProduct.body.data[0].recall_number).toBe("D-0002-2026");

    const byReason = await request(app).get("/recalls").query({ q: "nitrosamine" });
    expect(byReason.body.data).toHaveLength(1);
    expect(byReason.body.data[0].recall_number).toBe("D-0003-2026");
  });

  it("paginates with limit and offset", async () => {
    const page = await request(app).get("/recalls").query({ limit: 1, offset: 1 });
    expect(page.body.pagination).toEqual({ limit: 1, offset: 1, total: 3 });
    expect(page.body.data).toHaveLength(1);
    expect(page.body.data[0].recall_number).toBe("D-0001-2026");
  });

  it("GET /recalls/:recallNumber returns one recall including raw JSON", async () => {
    const response = await request(app).get("/recalls/D-0001-2026");
    expect(response.status).toBe(200);
    expect(response.body.data.recall_number).toBe("D-0001-2026");
    expect(response.body.data.city).toBe("Chicago");
    expect(response.body.data.raw).toEqual({
      recall_number: "D-0001-2026",
      source: "seed",
    });
  });

  it("GET /recalls/:recallNumber returns 404 when missing", async () => {
    const response = await request(app).get("/recalls/D-9999-2099");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Recall not found" });
  });

  it("rejects invalid query parameters", async () => {
    const badLimit = await request(app).get("/recalls").query({ limit: 0 });
    expect(badLimit.status).toBe(400);

    const badDate = await request(app).get("/recalls").query({ from: "January 1" });
    expect(badDate.status).toBe(400);
  });

  it.runIf(Boolean(readonlyUrl))(
    "the read-only role can select but cannot insert",
    async () => {
      const readonlyPool = createTestPool(readonlyUrl!);
      try {
        const selected = await readonlyPool.query(
          "SELECT recall_number FROM recalls ORDER BY recall_number",
        );
        expect(selected.rowCount).toBe(3);

        await expect(
          readonlyPool.query(
            `INSERT INTO recalls (recall_number, raw) VALUES ($1, $2::jsonb)`,
            ["D-FORBIDDEN-2026", JSON.stringify({ ok: false })],
          ),
        ).rejects.toThrow(/permission denied/i);
      } finally {
        await readonlyPool.end();
      }
    },
  );
});

describe.skipIf(hasDatabase)("API (no DATABASE_URL — mocked)", () => {
  it("skips integration tests when Postgres is not configured", () => {
    expect(hasDatabase).toBe(false);
  });
});
