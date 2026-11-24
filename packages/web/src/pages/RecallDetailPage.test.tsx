import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../App.tsx";
import { jsonResponse, sampleRecalls } from "../test/fixtures.ts";
import { renderWithRouter } from "../test/render.tsx";

describe("RecallDetailPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads a recall and keeps list filters on the back link", async () => {
    const recall = {
      ...sampleRecalls[0]!,
      raw: { recall_number: "D-0001-2026", source: "test" },
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: recall }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithRouter(<App />, { route: "/recalls/D-0001-2026?q=statin&page=2" });

    expect(screen.getByRole("status")).toHaveTextContent("Loading recall…");
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Atorvastatin 20mg tablets, 90-count bottle",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/recalls/D-0001-2026",
      expect.anything(),
    );
    expect(screen.getByText("Failed dissolution specifications")).toBeInTheDocument();
    expect(screen.getByText("Northwind Pharma")).toBeInTheDocument();
    expect(screen.getByText("Chicago, IL, United States")).toBeInTheDocument();
    expect(screen.getByText("Jan 20, 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Back to results" })).toHaveAttribute(
      "href",
      "/?q=statin&page=2",
    );

    await userEvent.click(screen.getByText("Raw openFDA record"));
    expect(screen.getByText(/"source": "test"/)).toBeInTheDocument();
  });

  it("shows a not-found state for a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Recall not found" }, 404)),
    );
    renderWithRouter(<App />, { route: "/recalls/D-9999-2099" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Recall not found");
    expect(screen.getByText(/D-9999-2099/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("retries after a server error", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "Internal server error" }, 500))
      .mockResolvedValueOnce(jsonResponse({ data: sampleRecalls[0] }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithRouter(<App />, { route: "/recalls/D-0001-2026" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Internal server error");

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Atorvastatin");
  });
});
