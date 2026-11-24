export type RecallListQuery = {
  q?: string;
  classification?: string;
  state?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export type Recall = {
  recall_number: string;
  status: string | null;
  classification: string | null;
  product_description: string | null;
  reason_for_recall: string | null;
  recalling_firm: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  recall_initiation_date: string | null;
  report_date: string | null;
  distribution_pattern: string | null;
  created_at: string;
  updated_at: string;
  raw?: unknown;
};

export type Pagination = {
  limit: number;
  offset: number;
  total: number;
};

export type RecallListResponse = {
  data: Recall[];
  pagination: Pagination;
};

export type RecallDetailResponse = {
  data: Recall;
};
