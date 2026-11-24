import { Link, useParams, useSearchParams } from "react-router-dom";
import { ClassificationBadge } from "../components/ClassificationBadge.tsx";
import { StatusMessage } from "../components/StatusMessage.tsx";
import { useRecall } from "../hooks/useRecall.ts";
import { formatDate } from "../lib/dates.ts";

export function RecallDetailPage() {
  const { recallNumber } = useParams();
  const [params] = useSearchParams();
  const decoded = recallNumber ? decodeURIComponent(recallNumber) : undefined;
  const result = useRecall(decoded);
  const backTo = params.toString() ? `/?${params.toString()}` : "/";

  return (
    <div className="page page--detail">
      <p className="back">
        <Link to={backTo}>← Back to results</Link>
      </p>

      {result.status === "loading" ? (
        <StatusMessage tone="loading" title="Loading recall…">
          Retrieving the full enforcement report.
        </StatusMessage>
      ) : null}

      {result.status === "error" ? (
        <StatusMessage
          tone="error"
          title={result.statusCode === 404 ? "Recall not found" : "Could not load this recall"}
          action={
            result.statusCode === 404
              ? undefined
              : { label: "Try again", onClick: result.retry }
          }
        >
          {result.statusCode === 404
            ? `No recall with number ${decoded} is in this database.`
            : result.message}
        </StatusMessage>
      ) : null}

      {result.status === "success" ? <RecallDetail recall={result.data} /> : null}
    </div>
  );
}

function RecallDetail({
  recall,
}: {
  recall: import("../api/types.ts").Recall;
}) {
  const location = [recall.city, recall.state, recall.country]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="detail">
      <header className="detail__header">
        <p className="detail__kicker">{recall.recall_number}</p>
        <h1>{recall.product_description || "Untitled recall"}</h1>
        <div className="detail__meta">
          <ClassificationBadge classification={recall.classification} />
          <span>{recall.status || "Status unknown"}</span>
        </div>
      </header>

      <dl className="detail__grid">
        <div>
          <dt>Reason for recall</dt>
          <dd>{recall.reason_for_recall || "—"}</dd>
        </div>
        <div>
          <dt>Recalling firm</dt>
          <dd>{recall.recalling_firm || "—"}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{location || "—"}</dd>
        </div>
        <div>
          <dt>Distribution pattern</dt>
          <dd>{recall.distribution_pattern || "—"}</dd>
        </div>
        <div>
          <dt>Recall initiation date</dt>
          <dd>{formatDate(recall.recall_initiation_date)}</dd>
        </div>
        <div>
          <dt>Report date</dt>
          <dd>{formatDate(recall.report_date)}</dd>
        </div>
      </dl>

      {recall.raw !== undefined ? (
        <details className="raw">
          <summary>Raw openFDA record</summary>
          <pre>{JSON.stringify(recall.raw, null, 2)}</pre>
        </details>
      ) : null}
    </article>
  );
}
