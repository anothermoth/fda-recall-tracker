import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { Pool } from "pg";
import { healthRouter } from "./routes/health.js";
import { recallsRouter } from "./routes/recalls.js";

export function createApp(pool: Pool): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());
  app.use(
    cors({
      origin: parseCorsOrigins(process.env.CORS_ORIGIN),
    }),
  );


  app.use(healthRouter(pool));
  app.use(recallsRouter(pool));

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      typeof err.status === "number"
        ? err.status
        : 500;
    const message =
      err instanceof Error && status < 500 ? err.message : "Internal server error";
    if (status >= 500) {
      console.error(err);
    }
    res.status(status).json({ error: message });
  });

  return app;
}

function parseCorsOrigins(
  value: string | undefined,
): boolean | string[] {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "*") {
    // Reflect the request origin. Fine for this public, read-only API
    // when no explicit allowlist is configured.
    return true;
  }
  return trimmed.split(",").map((origin) => origin.trim()).filter(Boolean);
}
