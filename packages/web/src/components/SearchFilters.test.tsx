import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_FILTERS } from "../lib/searchParams.ts";
import { renderWithRouter } from "../test/render.tsx";
import { SearchFilters } from "./SearchFilters.tsx";

describe("SearchFilters", () => {
  it("submits the current draft and resets the page to 1", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithRouter(
      <SearchFilters
        value={{ ...EMPTY_FILTERS, q: "old", page: 4 }}
        onSubmit={onSubmit}
      />,
    );

    const search = screen.getByLabelText("Search");
    await user.clear(search);
    await user.type(search, "ibuprofen");
    await user.selectOptions(screen.getByLabelText("Classification"), "Class II");
    await user.selectOptions(screen.getByLabelText("State"), "TX");
    await user.type(screen.getByLabelText("Report date from"), "2026-01-01");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(onSubmit).toHaveBeenCalledWith({
      q: "ibuprofen",
      classification: "Class II",
      state: "TX",
      from: "2026-01-01",
      to: "",
      page: 1,
    });
  });

  it("resets all filters", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithRouter(
      <SearchFilters
        value={{ ...EMPTY_FILTERS, q: "ibuprofen", state: "TX", page: 2 }}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(onSubmit).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});
