import pg from "pg";
import { resolveDatabaseUrl } from "./databaseUrl.js";

export { resolveDatabaseUrl };

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  return url;
}

export function createPool(connectionString = getDatabaseUrl()): pg.Pool {
  return new pg.Pool({
    connectionString,
    // Lambdas should reuse a small pool across warm invocations.
    max: process.env.AWS_LAMBDA_FUNCTION_NAME ? 2 : 10,
  });
}

let cachedPool: pg.Pool | undefined;

/** Resolve DATABASE_URL or Secrets Manager once and reuse the pool. */
export async function getLambdaPool(): Promise<pg.Pool> {
  if (cachedPool) {
    return cachedPool;
  }
  cachedPool = createPool(await resolveDatabaseUrl());
  return cachedPool;
}
