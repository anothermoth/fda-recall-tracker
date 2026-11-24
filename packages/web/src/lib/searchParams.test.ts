import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  filtersFromSearchParams,
  filtersToListQuery,
  filtersToSearchParams,
  PAGE_SIZE,
} from "./searchParams.ts";

describe("filtersFromSearchParams", () => {
  it("reads filters and defaults page to 1", () => {
    const params = new URLSearchParams(
      "q=ibuprofen&classification=Class+II&state=TX&from=2026-01-01&to=2026-02-01&page=3",
    );
    expect(filtersFromSearchParams(params)).toEqual({
      q: "ibuprofen",
      classification: "Class II",
      state: "TX",
      from: "2026-01-01",
      to: "2026-02-01",
      page: 3,
    });
    expect(filtersFromSearchParams(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });

  it("treats a non-positive page as 1", () => {
    expect(filtersFromSearchParams(new URLSearchParams("page=0")).page).toBe(1);
    expect(filtersFromSearchParams(new URLSearchParams("page=abc")).page).toBe(1);
  });
});

describe("filtersToSearchParams", () => {
  it("omits empty values and page 1 so the URL stays short", () => {
    expect(filtersToSearchParams(EMPTY_FILTERS).toString()).toBe("");
    expect(
      filtersToSearchParams({
        q: "insulin",
        classification: "",
        state: "IL",
        from: "",
        to: "",
        page: 2,
      }).toString(),
    ).toBe("q=insulin&state=IL&page=2");
  });
});

describe("filtersToListQuery", () => {
  it("maps a 1-based page to limit and offset", () => {
    expect(
      filtersToListQuery({
        q: "label",
        classification: "Class I",
        state: "",
        from: "",
        to: "",
        page: 3,
      }),
    ).toEqual({
      q: "label",
      classification: "Class I",
      state: undefined,
      from: undefined,
      to: undefined,
      limit: PAGE_SIZE,
      offset: PAGE_SIZE * 2,
    });
  });
});
