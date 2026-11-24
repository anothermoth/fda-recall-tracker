import { useSearchParams } from "react-router-dom";
import { Pagination } from "../components/Pagination.tsx";
import { RecallResults } from "../components/RecallResults.tsx";
import { SearchFilters } from "../components/SearchFilters.tsx";
import { StatusMessage } from "../components/StatusMessage.tsx";
import { useRecalls } from "../hooks/useRecalls.ts";
import {
  filtersFromSearchParams,
  filtersToListQuery,
  filtersToSearchParams,
  type Filters,
} from "../lib/searchParams.ts";

export function RecallListPage() {
  const [params, setParams] = useSearchParams();
  const filters = filtersFromSearchParams(params);
  const result = useRecalls(filtersToListQuery(filters));

  function applyFilters(next: Filters) {
    setParams(filtersToSearchParams(next), { replace: false });
  }

  return (
    <div className="page">
      <div className="page__intro">
        <h1>Search drug recalls</h1>
        <p>
          Browse the most recently reported FDA drug enforcement recalls. Filter
          by classification, the recalling firm&apos;s state, or report date, and
          open a recall for the full record.
        </p>
      </div>

      <SearchFilters value={filters} onSubmit={applyFilters} />

      {result.status === "loading" ? (
        <StatusMessage tone="loading" title="Loading recalls…">
          Fetching the latest matching enforcement reports.
        </StatusMessage>
      ) : null}

      {result.status === "error" ? (
        <StatusMessage
          tone="error"
          title="Could not load recalls"
          action={{ label: "Try again", onClick: result.retry }}
        >
          {result.message}
        </StatusMessage>
      ) : null}

      {result.status === "success" && result.data.data.length === 0 ? (
        <StatusMessage tone="empty" title="No recalls match these filters">
          Try a broader search, clear a filter, or reset to see the most recent
          reports.
        </StatusMessage>
      ) : null}

      {result.status === "success" && result.data.data.length > 0 ? (
        <section className="panel" aria-label="Recall results">
          <RecallResults recalls={result.data.data} filters={filters} />
          <Pagination
            page={filters.page}
            total={result.data.pagination.total}
            onPageChange={(page) => applyFilters({ ...filters, page })}
          />
        </section>
      ) : null}
    </div>
  );
}
