import { Link } from "react-router-dom";
import type { Recall } from "../api/types.ts";
import { formatDate } from "../lib/dates.ts";
import { searchStringFromFilters, type Filters } from "../lib/searchParams.ts";
import { ClassificationBadge } from "./ClassificationBadge.tsx";

type RecallResultsProps = {
  recalls: Recall[];
  filters: Filters;
};

export function RecallResults({ recalls, filters }: RecallResultsProps) {
  const query = searchStringFromFilters(filters);

  return (
    <div className="table-wrap">
      <table className="results">
        <thead>
          <tr>
            <th scope="col">Report date</th>
            <th scope="col">Class</th>
            <th scope="col">Product</th>
            <th scope="col">Recalling firm</th>
            <th scope="col">State</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {recalls.map((recall) => (
            <tr key={recall.recall_number} data-testid="recall-row">
              <td data-label="Report date">{formatDate(recall.report_date)}</td>
              <td data-label="Class">
                <ClassificationBadge classification={recall.classification} />
              </td>
              <td data-label="Product">
                <Link
                  className="results__link"
                  to={`/recall/${encodeURIComponent(recall.recall_number)}${query}`}
                >
                  <span className="results__product">
                    {recall.product_description || "No product description"}
                  </span>
                  <span className="results__number">{recall.recall_number}</span>
                </Link>
              </td>
              <td data-label="Recalling firm">{recall.recalling_firm || "—"}</td>
              <td data-label="State">{recall.state || "—"}</td>
              <td data-label="Status">{recall.status || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
