import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination.tsx";
import { renderWithRouter } from "../test/render.tsx";

describe("Pagination", () => {
  it("describes the current range and moves between pages", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderWithRouter(<Pagination page={2} total={25} onPageChange={onPageChange} />);

    expect(screen.getByText("Showing 11–20 of 25 recalls")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("disables previous on the first page", () => {
    renderWithRouter(<Pagination page={1} total={4} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByText("Showing 1–4 of 4 recalls")).toBeInTheDocument();
  });
});
