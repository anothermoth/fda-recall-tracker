import { describe, expect, it, vi } from "vitest";
import { runIngest } from "../src/runIngest.ts";
import type { IngestDependencies, OpenFdaPage, OpenFdaRecall } from "../src/types.ts";

function page(
  records: OpenFdaRecall[],
  meta?: { skip?: number; limit?: number; total?: number },
): OpenFdaPage {
  return { meta: { results: meta }, results: records };
}

function record(recallNumber: string): OpenFdaRecall {
  return {
    recall_number: recallNumber,
    classification: "Class II",
    product_description: "Sample drug",
    reason_for_recall: "Labeling",
    report_date: "20260115",
  };
}

describe("runIngest", () => {
  it("pages until the requested total is reached and upserts mapped rows", async () => {
    const fetchPage = vi.fn(async ({ skip, limit }: { skip: number; limit: number }) => {
      const start = skip + 1;
      const records = Array.from({ length: limit }, (_, i) =>
        record(`D-${String(start + i).padStart(4, "0")}-2026`),
      );
      return page(records, { skip, limit, total: 1000 });
    });
    const upsertRecalls = vi.fn(async (rows: { recallNumber: string }[]) => ({
      inserted: rows.length,
      updated: 0,
    }));
    const archiveRaw = vi.fn(async () => undefined);

    const deps: IngestDependencies = { fetchPage, upsertRecalls, archiveRaw };
    const result = await runIngest({ total: 250, pageSize: 100 }, deps);

    expect(result).toEqual({
      requested: 250,
      fetched: 250,
      skipped: 0,
      inserted: 250,
      updated: 0,
      pages: 3,
    });
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, { skip: 0, limit: 100 });
    expect(fetchPage).toHaveBeenNthCalledWith(2, { skip: 100, limit: 100 });
    expect(fetchPage).toHaveBeenNthCalledWith(3, { skip: 200, limit: 50 });
    expect(archiveRaw).toHaveBeenCalledTimes(3);
    expect(upsertRecalls.mock.calls[0]?.[0]).toHaveLength(100);
    expect(upsertRecalls.mock.calls[2]?.[0]).toHaveLength(50);
  });

  it("stops early when a short page is returned", async () => {
    const fetchPage = vi.fn(async () => page([record("D-0001-2026")]));
    const upsertRecalls = vi.fn(async (rows: { recallNumber: string }[]) => ({
      inserted: rows.length,
      updated: 0,
    }));

    const result = await runIngest(
      { total: 100, pageSize: 50 },
      { fetchPage, upsertRecalls },
    );

    expect(result.fetched).toBe(1);
    expect(result.pages).toBe(1);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("counts records without a recall_number as skipped", async () => {
    const fetchPage = vi.fn(async () =>
      page([record("D-0001-2026"), { status: "Ongoing" }]),
    );
    const upsertRecalls = vi.fn(async (rows: { recallNumber: string }[]) => ({
      inserted: rows.length,
      updated: 0,
    }));

    const result = await runIngest(
      { total: 2, pageSize: 10 },
      { fetchPage, upsertRecalls },
    );

    expect(result.fetched).toBe(1);
    expect(result.skipped).toBe(1);
    expect(upsertRecalls.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it("rejects a non-positive total", async () => {
    await expect(
      runIngest({ total: 0 }, { fetchPage: vi.fn(), upsertRecalls: vi.fn() }),
    ).rejects.toThrow(/positive integer/);
  });
});
