import { PAGE_SIZE } from "../lib/searchParams.ts";

type PaginationProps = {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
  const end = Math.min(current * PAGE_SIZE, total);

  return (
    <nav className="pagination" aria-label="Recall results">
      <p className="pagination__summary">
        {total === 0
          ? "No results"
          : `Showing ${start}–${end} of ${total.toLocaleString()} recalls`}
      </p>
      <div className="pagination__controls">
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
        >
          Previous
        </button>
        <p className="pagination__page">
          Page {current} of {pageCount}
        </p>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onPageChange(current + 1)}
          disabled={current >= pageCount || total === 0}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
