import { describe, expect, it } from "vitest";
import { formatDate } from "./dates.ts";

describe("formatDate", () => {
  it("formats ISO dates in UTC so the calendar day does not shift", () => {
    expect(formatDate("2026-01-20")).toBe("Jan 20, 2026");
    expect(formatDate(null)).toBe("—");
  });
});
