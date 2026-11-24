import type { Recall, RecallListResponse } from "../api/types.ts";

export const sampleRecalls: Recall[] = [
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
    created_at: "2026-01-20T12:00:00.000Z",
    updated_at: "2026-01-20T12:00:00.000Z",
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
    created_at: "2026-02-15T12:00:00.000Z",
    updated_at: "2026-02-15T12:00:00.000Z",
  },
];

export const listResponse = (
  recalls: Recall[] = sampleRecalls,
  pagination: Partial<RecallListResponse["pagination"]> = {},
): RecallListResponse => ({
  data: recalls,
  pagination: {
    limit: 10,
    offset: 0,
    total: recalls.length,
    ...pagination,
  },
});

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
