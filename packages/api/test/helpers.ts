import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
config({ path: path.join(rootDir, ".env") });

export const databaseUrl = process.env.DATABASE_URL;
export const readonlyUrl = process.env.DATABASE_READONLY_URL;

export function createTestPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString });
}

export const seedRecalls = [
  {
    recall_number: "D-0001-2026",
    status: "Ongoing",
    classification: "Class I",
    product_description: "Atorvastatin 20mg tablets, 90-count bottle",
    reason_for_recall: "Failed dissolution specifications",
    recalling_firm: "Northwind Pharma",
    city: "Chicago",
    state: "IL",
    country: "United States",
    recall_initiation_date: "2026-01-05",
    report_date: "2026-01-20",
    distribution_pattern: "Nationwide",
    raw: { recall_number: "D-0001-2026", source: "seed" },
  },
  {
    recall_number: "D-0002-2026",
    status: "Ongoing",
    classification: "Class II",
    product_description: "Ibuprofen 200mg caplets",
    reason_for_recall: "Incorrect labeling of strength",
    recalling_firm: "Lakeside Labs",
    city: "Austin",
    state: "TX",
    country: "United States",
    recall_initiation_date: "2026-02-01",
    report_date: "2026-02-15",
    distribution_pattern: "TX, OK, LA",
    raw: { recall_number: "D-0002-2026", source: "seed" },
  },
  {
    recall_number: "D-0003-2026",
    status: "Terminated",
    classification: "Class II",
    product_description: "Metformin 500mg tablets",
    reason_for_recall: "Presence of nitrosamine impurity",
    recalling_firm: "Prairie Drug Co",
    city: "Dallas",
    state: "TX",
    country: "United States",
    recall_initiation_date: "2025-11-02",
    report_date: "2025-12-01",
    distribution_pattern: "Nationwide",
    raw: { recall_number: "D-0003-2026", source: "seed" },
  },
];

export async function resetAndSeed(pool: pg.Pool): Promise<void> {
  await pool.query("TRUNCATE recalls RESTART IDENTITY");
  for (const row of seedRecalls) {
    await pool.query(
      `INSERT INTO recalls (
        recall_number, status, classification, product_description,
        reason_for_recall, recalling_firm, city, state, country,
        recall_initiation_date, report_date, distribution_pattern, raw
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)`,
      [
        row.recall_number,
        row.status,
        row.classification,
        row.product_description,
        row.reason_for_recall,
        row.recalling_firm,
        row.city,
        row.state,
        row.country,
        row.recall_initiation_date,
        row.report_date,
        row.distribution_pattern,
        JSON.stringify(row.raw),
      ],
    );
  }
}
