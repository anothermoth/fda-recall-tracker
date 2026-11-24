import type { Handler } from "aws-lambda";
import serverless from "serverless-http";
import { createApp } from "./app.js";
import { getLambdaPool } from "./db.js";

type ServerlessHandler = ReturnType<typeof serverless>;

let cached: ServerlessHandler | undefined;

/**
 * API Gateway HTTP API entry point. Wraps the same Express app used
 * in local development. The pool is created on the first invoke and
 * reused on warm starts.
 */
export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!cached) {
    const pool = await getLambdaPool();
    cached = serverless(createApp(pool));
  }
  return cached(event, context);
};
