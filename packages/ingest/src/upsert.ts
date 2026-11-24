import type { Pool } from "pg";
import type { RecallRow } from "./types.js";

const UPSERT_SQL = `
  INSERT INTO recalls (
    recall_number,
    status,
    classification,
    product_description,
    reason_for_recall,
    recalling_firm,
    city,
    state,
    country,
    recall_initiation_date,
    report_date,
    distribution_pattern,
    raw
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
  ON CONFLICT (recall_number) DO UPDATE SET
    status = EXCLUDED.status,
    classification = EXCLUDED.classification,
    product_description = EXCLUDED.product_description,
    reason_for_recall = EXCLUDED.reason_for_recall,
    recalling_firm = EXCLUDED.recalling_firm,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    country = EXCLUDED.country,
    recall_initiation_date = EXCLUDED.recall_initiation_date,
    report_date = EXCLUDED.report_date,
    distribution_pattern = EXCLUDED.distribution_pattern,
    raw = EXCLUDED.raw,
    updated_at = NOW()
  RETURNING (xmax = 0) AS is_insert
`;

export async function upsertRecalls(
  pool: Pool,
  rows: RecallRow[],
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  if (rows.length === 0) {
    return { inserted, updated };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      const result = await client.query<{ is_insert: boolean }>(UPSERT_SQL, [
        row.recallNumber,
        row.status,
        row.classification,
        row.productDescription,
        row.reasonForRecall,
        row.recallingFirm,
        row.city,
        row.state,
        row.country,
        row.recallInitiationDate,
        row.reportDate,
        row.distributionPattern,
        JSON.stringify(row.raw),
      ]);
      if (result.rows[0]?.is_insert) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { inserted, updated };
}
