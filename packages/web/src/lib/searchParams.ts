import type { RecallListQuery } from "../api/types.ts";

export const PAGE_SIZE = 10;

export type Filters = {
  q: string;
  classification: string;
  state: string;
  from: string;
  to: string;
  page: number;
};

export const EMPTY_FILTERS: Filters = {
  q: "",
  classification: "",
  state: "",
  from: "",
  to: "",
  page: 1,
};

function first(params: URLSearchParams, key: string): string {
  return params.get(key)?.trim() ?? "";
}

export function filtersFromSearchParams(params: URLSearchParams): Filters {
  const rawPage = Number(params.get("page") ?? "1");
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  return {
    q: first(params, "q"),
    classification: first(params, "classification"),
    state: first(params, "state"),
    from: first(params, "from"),
    to: first(params, "to"),
    page,
  };
}

export function filtersToSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.classification) params.set("classification", filters.classification);
  if (filters.state) params.set("state", filters.state);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

export function filtersToListQuery(filters: Filters): RecallListQuery {
  return {
    q: filters.q || undefined,
    classification: filters.classification || undefined,
    state: filters.state || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    limit: PAGE_SIZE,
    offset: (filters.page - 1) * PAGE_SIZE,
  };
}

export function searchStringFromFilters(filters: Filters): string {
  const params = filtersToSearchParams(filters);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
