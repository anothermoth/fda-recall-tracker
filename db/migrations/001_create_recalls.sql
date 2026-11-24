-- Core recall table. recall_number is the FDA natural key and the
-- upsert target for the ingest job.
CREATE TABLE recalls (
  id BIGSERIAL PRIMARY KEY,
  recall_number TEXT NOT NULL UNIQUE,
  status TEXT,
  classification TEXT,
  product_description TEXT,
  reason_for_recall TEXT,
  recalling_firm TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  recall_initiation_date DATE,
  report_date DATE,
  distribution_pattern TEXT,
  raw JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(product_description, '') || ' ' || coalesce(reason_for_recall, '')
    )
  ) STORED
);

-- Equality filter used by GET /recalls?classification=
CREATE INDEX idx_recalls_classification ON recalls (classification);

-- Range filters and the default "newest first" sort on GET /recalls
CREATE INDEX idx_recalls_report_date ON recalls (report_date DESC);

-- Equality filter used by GET /recalls?state=
CREATE INDEX idx_recalls_state ON recalls (state);

-- Full-text search for GET /recalls?q=  (tsvector @@ plainto_tsquery)
CREATE INDEX idx_recalls_search_tsv ON recalls USING GIN (search_tsv);
