import { Router } from "express";
import type { Pool } from "pg";
import { asyncHandler } from "../asyncHandler.js";

export function healthRouter(pool: Pool): Router {
  const router = Router();

  router.get(
    "/health",
    asyncHandler(async (_req, res) => {
      await pool.query("SELECT 1");
      res.json({ status: "ok" });
    }),
  );

  return router;
}
