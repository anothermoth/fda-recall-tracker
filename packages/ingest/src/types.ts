export type OpenFdaRecall = {
  recall_number?: unknown;
  status?: unknown;
  classification?: unknown;
  product_description?: unknown;
  reason_for_recall?: unknown;
  recalling_firm?: unknown;
  city?: unknown;
  state?: unknown;
  country?: unknown;
  recall_initiation_date?: unknown;
  report_date?: unknown;
  distribution_pattern?: unknown;
  [key: string]: unknown;
};

export type OpenFdaPage = {
  meta?: {
    results?: {
      skip?: number;
      limit?: number;
      total?: number;
    };
  };
  results?: OpenFdaRecall[];
  error?: { code?: string; message?: string };
};

export type RecallRow = {
  recallNumber: string;
  status: string | null;
  classification: string | null;
  productDescription: string | null;
  reasonForRecall: string | null;
  recallingFirm: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  recallInitiationDate: string | null;
  reportDate: string | null;
  distributionPattern: string | null;
  raw: OpenFdaRecall;
};

export type IngestOptions = {
  total: number;
  pageSize?: number;
};

export type IngestResult = {
  requested: number;
  fetched: number;
  skipped: number;
  inserted: number;
  updated: number;
  pages: number;
};

export type FetchPageParams = {
  skip: number;
  limit: number;
};

export type IngestDependencies = {
  fetchPage: (params: FetchPageParams) => Promise<OpenFdaPage>;
  upsertRecalls: (rows: RecallRow[]) => Promise<{ inserted: number; updated: number }>;
  /**
   * Optional hook for a later AWS step: archive the raw JSON page to S3
   * before or after upsert. The local CLI leaves this unimplemented.
   */
  archiveRaw?: (page: OpenFdaPage, params: FetchPageParams) => Promise<void>;
};
