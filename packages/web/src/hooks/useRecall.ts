import { useEffect, useState } from "react";
import { ApiError, fetchRecall } from "../api/client.ts";
import type { Recall } from "../api/types.ts";

export type RecallState =
  | { status: "loading" }
  | { status: "success"; data: Recall }
  | { status: "error"; message: string; statusCode?: number };

export function useRecall(recallNumber: string | undefined): RecallState & {
  retry: () => void;
} {
  const [state, setState] = useState<RecallState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!recallNumber) {
      setState({ status: "error", message: "Missing recall number", statusCode: 400 });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    void fetchRecall(recallNumber, controller.signal)
      .then((data) => {
        setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (error instanceof ApiError) {
          setState({
            status: "error",
            message: error.message,
            statusCode: error.status,
          });
          return;
        }
        setState({
          status: "error",
          message: "Unable to load this recall. Check your connection and try again.",
        });
      });

    return () => controller.abort();
  }, [recallNumber, attempt]);

  return {
    ...state,
    retry: () => setAttempt((n) => n + 1),
  };
}
