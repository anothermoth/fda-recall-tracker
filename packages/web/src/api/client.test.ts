import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, buildListUrl, fetchRecall, fetchRecalls } from "./client.ts";
import { jsonResponse, listResponse, sampleRecalls } from "../test/fixtures.ts";

describe("buildListUrl", () => {
  it("omits empty filters and includes pagination", () => {
    expect(buildListUrl({ limit: 10, offset: 0 })).toBe("/recalls?limit=10&offset=0");
    expect(
      buildListUrl({
        q: "ibuprofen",
        classification: "Class II",
        state: "TX",
        from: "2026-01-01",
        to: "2026-12-31",
        limit: 10,
        offset: 10,
      }),
    ).toBe(
      "/recalls?q=ibuprofen&classification=Class+II&state=TX&from=2026-01-01&to=2026-12-31&limit=10&offset=10",
    );
  });
});

describe("fetchRecalls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a typed list payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(listResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRecalls({ q: "statin", limit: 10, offset: 0 });

    expect(fetchMock).toHaveBeenCalledWith(
      "/recalls?q=statin&limit=10&offset=0",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
    expect(result.data[0]?.recall_number).toBe("D-0001-2026");
    expect(result.pagination.total).toBe(2);
  });

  it("throws an ApiError with the server message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "from must be a YYYY-MM-DD date" }, 400)),
    );

    await expect(fetchRecalls({ from: "nope" })).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "from must be a YYYY-MM-DD date",
    } satisfies Partial<ApiError>);
  });
});

describe("fetchRecall", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encodes the recall number and returns data", async () => {
    const recall = { ...sampleRecalls[0]!, raw: { recall_number: "D-0001-2026" } };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: recall }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchRecall("D-0001-2026")).resolves.toEqual(recall);
    expect(fetchMock).toHaveBeenCalledWith(
      "/recalls/D-0001-2026",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("throws a 404 ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Recall not found" }, 404)),
    );

    await expect(fetchRecall("missing")).rejects.toMatchObject({
      status: 404,
      message: "Recall not found",
    });
  });
});
