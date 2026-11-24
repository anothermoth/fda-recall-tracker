import { describe, expect, it } from "vitest";
import { mapRecall, mapRecalls, parseFdaDate } from "../src/mapRecall.ts";
import type { OpenFdaRecall } from "../src/types.ts";

const sample: OpenFdaRecall = {
  status: "Ongoing",
  city: "Austin",
  state: "TX",
  country: "United States",
  classification: "Class II",
  recalling_firm: "Victory Medical Center Pharmacy",
  distribution_pattern: "CO, FL, TX",
  recall_number: "D-0145-2027",
  product_description:
    "THYMOSIN ALPHA-1 (MDV) 3MG/ML **5ML**, VMC, Victory Medical Center Pharmacy, Austin, Texas",
  reason_for_recall: "Lack of Processing Controls",
  recall_initiation_date: "20261019",
  report_date: "20261111",
  product_type: "Drugs",
};

describe("parseFdaDate", () => {
  it("converts YYYYMMDD to ISO dates", () => {
    expect(parseFdaDate("20261111")).toBe("2026-11-11");
  });

  it("passes through already-ISO dates", () => {
    expect(parseFdaDate("2026-11-11")).toBe("2026-11-11");
  });

  it("returns null for missing or invalid values", () => {
    expect(parseFdaDate(undefined)).toBeNull();
    expect(parseFdaDate(null)).toBeNull();
    expect(parseFdaDate(20261111)).toBeNull();
    expect(parseFdaDate("November 11")).toBeNull();
    expect(parseFdaDate("")).toBeNull();
    expect(parseFdaDate("  ")).toBeNull();
  });
});

describe("mapRecall", () => {
  it("maps an openFDA record onto the recalls table shape", () => {
    const row = mapRecall(sample);
    expect(row).toMatchObject({
      recallNumber: "D-0145-2027",
      status: "Ongoing",
      classification: "Class II",
      recallingFirm: "Victory Medical Center Pharmacy",
      city: "Austin",
      state: "TX",
      country: "United States",
      recallInitiationDate: "2026-10-19",
      reportDate: "2026-11-11",
      distributionPattern: "CO, FL, TX",
      reasonForRecall: "Lack of Processing Controls",
    });
    expect(row?.raw).toBe(sample);
  });

  it("returns null when recall_number is missing", () => {
    expect(mapRecall({ status: "Ongoing" })).toBeNull();
    expect(mapRecall({ recall_number: "   " })).toBeNull();
  });

  it("trims strings and treats blanks as null", () => {
    const row = mapRecall({
      recall_number: "  D-0001-2026  ",
      status: "  ",
      state: " TX ",
    });
    expect(row?.recallNumber).toBe("D-0001-2026");
    expect(row?.status).toBeNull();
    expect(row?.state).toBe("TX");
  });
});

describe("mapRecalls", () => {
  it("keeps valid rows and counts skipped records", () => {
    const { rows, skipped } = mapRecalls([
      sample,
      { status: "Terminated" },
      { ...sample, recall_number: "D-0146-2027" },
    ]);
    expect(rows).toHaveLength(2);
    expect(skipped).toBe(1);
    expect(rows.map((row) => row.recallNumber)).toEqual([
      "D-0145-2027",
      "D-0146-2027",
    ]);
  });
});
