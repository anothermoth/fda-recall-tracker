import type { FetchPageParams, OpenFdaPage } from "./types.js";

export const OPEN_FDA_ENFORCEMENT_URL =
  "https://api.fda.gov/drug/enforcement.json";

const DEFAULT_USER_AGENT =
  "fda-recall-tracker/0.1 (https://github.com/anothermoth/fda-recall-tracker)";

export async function fetchOpenFdaPage(
  params: FetchPageParams,
  options: { fetchImpl?: typeof fetch; userAgent?: string } = {},
): Promise<OpenFdaPage> {
  const url = new URL(OPEN_FDA_ENFORCEMENT_URL);
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("skip", String(params.skip));
  // Newest report_date first, so "--limit N" means "the last N records".
  url.searchParams.set("sort", "report_date:desc");

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": options.userAgent ?? DEFAULT_USER_AGENT,
    },
  });

  const body = (await response.json()) as OpenFdaPage;

  if (!response.ok || body.error) {
    const message =
      body.error?.message ??
      `openFDA request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return body;
}
