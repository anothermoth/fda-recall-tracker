export type RecallListQuery = {
  q?: string;
  classification?: string;
  state?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};

export type RecallRecord = {
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

export const RECALL_COLUMNS = `
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
  created_at,
  updated_at
`;
