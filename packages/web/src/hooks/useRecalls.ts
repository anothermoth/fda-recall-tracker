import { useEffect, useState } from "react";
import { ApiError, fetchRecalls } from "../api/client.ts";
import type { RecallListQuery, RecallListResponse } from "../api/types.ts";

export type RecallsState =
  | { status: "loading" }
  | { status: "success"; data: RecallListResponse }
  | { status: "error"; message: string };

export function useRecalls(query: RecallListQuery): RecallsState & {
  retry: () => void;
} {
  const [state, setState] = useState<RecallsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const { q, classification, state: region, from, to, limit, offset } = query;

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    void fetchRecalls(
      { q, classification, state: region, from, to, limit, offset },
      controller.signal,
    )
      .then((data) => {
        setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to load recalls. Check your connection and try again.";
        setState({ status: "error", message });
      });

    return () => controller.abort();
  }, [q, classification, region, from, to, limit, offset, attempt]);

  return {
    ...state,
    retry: () => setAttempt((n) => n + 1),
  };
}
