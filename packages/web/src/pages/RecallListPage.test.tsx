import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../App.tsx";
import { jsonResponse, listResponse, sampleRecalls } from "../test/fixtures.ts";
import { renderWithRouter } from "../test/render.tsx";

function mockFetch(impl: (url: string) => Response | Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    return Promise.resolve(impl(url));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("RecallListPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a loading state, then the results", async () => {
    mockFetch(() => jsonResponse(listResponse()));
    renderWithRouter(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading recalls…");
    expect(await screen.findByText("Atorvastatin 20mg tablets, 90-count bottle")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–2 of 2 recalls")).toBeInTheDocument();
  });

  it("reads filters from the URL when fetching", async () => {
    const fetchMock = mockFetch(() => jsonResponse(listResponse([sampleRecalls[1]!], { total: 1 })));
    renderWithRouter(<App />, { route: "/?q=ibuprofen&classification=Class+II&state=TX&page=2" });

    await screen.findByText("Ibuprofen 200mg caplets");
    expect(fetchMock).toHaveBeenCalledWith(
      "/recalls?q=ibuprofen&classification=Class+II&state=TX&limit=10&offset=10",
      expect.anything(),
    );
  });

  it("shows an empty state when nothing matches", async () => {
    mockFetch(() => jsonResponse(listResponse([], { total: 0 })));
    renderWithRouter(<App />);

    expect(await screen.findByText("No recalls match these filters")).toBeInTheDocument();
  });

  it("shows an error and retries the request", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(() => jsonResponse({ error: "database unavailable" }, 503));
    renderWithRouter(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("database unavailable");

    fetchMock.mockResolvedValueOnce(jsonResponse(listResponse()));
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Atorvastatin 20mg tablets, 90-count bottle")).toBeInTheDocument();
  });

  it("updates the URL when filters are applied", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(() => jsonResponse(listResponse()));
    renderWithRouter(<App />);
    await screen.findByText("Atorvastatin 20mg tablets, 90-count bottle");

    await user.type(screen.getByLabelText("Search"), "ibuprofen");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/recalls?q=ibuprofen&limit=10&offset=0",
        expect.anything(),
      );
    });
  });

  it("paginates from the current URL", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(() =>
      jsonResponse(listResponse(sampleRecalls, { total: 25, offset: 0 })),
    );
    renderWithRouter(<App />);
    await screen.findByText("Atorvastatin 20mg tablets, 90-count bottle");

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/recalls?limit=10&offset=10",
        expect.anything(),
      );
    });
  });
});

