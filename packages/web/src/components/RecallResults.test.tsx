import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS } from "../lib/searchParams.ts";
import { sampleRecalls } from "../test/fixtures.ts";
import { renderWithRouter } from "../test/render.tsx";
import { RecallResults } from "./RecallResults.tsx";

describe("RecallResults", () => {
  it("renders recalls and links to the detail view, keeping current filters", () => {
    renderWithRouter(
      <RecallResults
        recalls={sampleRecalls}
        filters={{ ...EMPTY_FILTERS, q: "statin", page: 2 }}
      />,
    );

    expect(screen.getByRole("link", { name: /atorvastatin/i })).toHaveAttribute(
      "href",
      "/recall/D-0001-2026?q=statin&page=2",
    );
    expect(screen.getByText("D-0001-2026")).toBeInTheDocument();
    expect(screen.getByText("Class I")).toBeInTheDocument();
    expect(screen.getByText("Northwind Pharma")).toBeInTheDocument();
    expect(screen.getAllByTestId("recall-row")).toHaveLength(2);
  });
});
