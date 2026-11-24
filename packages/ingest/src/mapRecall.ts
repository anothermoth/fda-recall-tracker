import type { OpenFdaRecall, RecallRow } from "./types.js";

/** Convert openFDA YYYYMMDD (or already-ISO) dates to YYYY-MM-DD. */
export function parseFdaDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Map one openFDA enforcement record to the recalls table shape.
 * Returns null when the record has no recall_number, which is required
 * for upserts.
 */
export function mapRecall(raw: OpenFdaRecall): RecallRow | null {
  const recallNumber = asOptionalString(raw.recall_number);
  if (!recallNumber) {
    return null;
  }

  return {
    recallNumber,
    status: asOptionalString(raw.status),
    classification: asOptionalString(raw.classification),
    productDescription: asOptionalString(raw.product_description),
    reasonForRecall: asOptionalString(raw.reason_for_recall),
    recallingFirm: asOptionalString(raw.recalling_firm),
    city: asOptionalString(raw.city),
    state: asOptionalString(raw.state),
    country: asOptionalString(raw.country),
    recallInitiationDate: parseFdaDate(raw.recall_initiation_date),
    reportDate: parseFdaDate(raw.report_date),
    distributionPattern: asOptionalString(raw.distribution_pattern),
    raw,
  };
}

export function mapRecalls(raws: OpenFdaRecall[]): {
  rows: RecallRow[];
  skipped: number;
} {
  const rows: RecallRow[] = [];
  let skipped = 0;
  for (const raw of raws) {
    const row = mapRecall(raw);
    if (row) {
      rows.push(row);
    } else {
      skipped += 1;
    }
  }
  return { rows, skipped };
}
