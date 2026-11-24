import type {
  Recall,
  RecallDetailResponse,
  RecallListQuery,
  RecallListResponse,
} from "./types.ts";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (!raw) {
    return "";
  }
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function buildListUrl(query: RecallListQuery): string {
  const params = new URLSearchParams();
  const entries: [string, string | number | undefined][] = [
    ["q", query.q],
    ["classification", query.classification],
    ["state", query.state],
    ["from", query.from],
    ["to", query.to],
    ["limit", query.limit],
    ["offset", query.offset],
  ];

  for (const [key, value] of entries) {
    if (value === undefined || value === "") {
      continue;
    }
    params.set(key, String(value));
  }

  const qs = params.toString();
  return `${getApiBaseUrl()}/recalls${qs ? `?${qs}` : ""}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body: unknown = await response.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
      ) {
        message = body.error;
      }
    } catch {
      // Keep the generic message when the body is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchRecalls(
  query: RecallListQuery = {},
  signal?: AbortSignal,
): Promise<RecallListResponse> {
  const response = await fetch(buildListUrl(query), {
    signal,
    headers: { Accept: "application/json" },
  });
  return readJson<RecallListResponse>(response);
}

export async function fetchRecall(
  recallNumber: string,
  signal?: AbortSignal,
): Promise<Recall> {
  const response = await fetch(
    `${getApiBaseUrl()}/recalls/${encodeURIComponent(recallNumber)}`,
    { signal, headers: { Accept: "application/json" } },
  );
  const body = await readJson<RecallDetailResponse>(response);
  return body.data;
}

export { buildListUrl };
