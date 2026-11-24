import { createApp } from "./app.js";
import { createPool } from "./db.js";

const port = Number(process.env.PORT ?? 3001);
const pool = createPool();
const app = createApp(pool);

const server = app.listen(port, () => {
  console.log(`API listening on http://127.0.0.1:${port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
