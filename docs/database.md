# Database notes

This file starts in step 1 with the schema, indexes, and the read-only
role that already exist. Query plans, backup/restore practice, and a
fuller roles write-up will be expanded as the project grows.

## Schema

`recalls` stores one row per FDA enforcement report.

- `recall_number` is the FDA natural key. It is unique and is the
  target of ingest upserts (`ON CONFLICT (recall_number)`).
- The typed columns cover the fields the API searches and displays.
- `raw jsonb` keeps the original openFDA document so we never lose
  fields we did not promote into columns.
- `search_tsv` is a stored generated `tsvector` over
  `product_description` and `reason_for_recall`. Keeping it as a
  column means the GIN index stays in sync automatically on ingest.

Migrations live in `db/migrations/` and are applied in filename order
by `npm run migrate`. Applied files are recorded in
`schema_migrations`.

## Why these indexes

| Index | Type | Why it is here |
| --- | --- | --- |
| `recalls_recall_number_key` | unique btree | Point lookups for `GET /recalls/:recallNumber` and a safe upsert key. |
| `idx_recalls_classification` | btree | Equality filter `?classification=Class I`. |
| `idx_recalls_report_date` | btree (`DESC`) | Date-range filters and the default "newest first" sort. |
| `idx_recalls_state` | btree | Equality filter `?state=TX`. |
| `idx_recalls_search_tsv` | GIN | Full-text search with `search_tsv @@ plainto_tsquery(...)`. GIN is the usual index type for `tsvector`. |

Step 1 does not add composite indexes. If a later dashboard filter
becomes a hot path (for example `state` + `report_date` together),
that is the point to measure with `EXPLAIN (ANALYZE, BUFFERS)` and
add one. Over-indexing slows ingest writes for little gain.

## Read-only role

Migration `002_app_readonly_role.sql` creates `fda_app_readonly`.
It can `CONNECT` and `SELECT`, but it cannot insert, update, or
delete. The local password is a documented development default in
that migration — change it before any real deployment.

The ingest job and migrations use the read/write `DATABASE_URL`.
The API can stay on that URL for local work. In a later hardening
pass the API should use `DATABASE_READONLY_URL` so a bug in the
HTTP layer cannot mutate data.

## Coming next

- Captured `EXPLAIN` plans for the list and search queries
- A backup and restore runbook (`pg_dump` / `pg_restore`) practiced
  against the local database
- A clearer split between migration, ingest, and API roles
