import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createLocalDependencies, createPoolFromEnv } from "./deps.js";
import { runIngest } from "./runIngest.js";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
config({ path: path.join(rootDir, ".env") });


async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      limit: { type: "string", default: "100" },
      "page-size": { type: "string", default: "100" },
    },
    allowPositionals: false,
  });

  const total = Number(values.limit);
  const pageSize = Number(values["page-size"]);
  if (!Number.isInteger(total) || total <= 0) {
    throw new Error("--limit must be a positive integer");
  }
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error("--page-size must be a positive integer");
  }

  const pool = await createPoolFromEnv();
  try {
    const result = await runIngest(
      { total, pageSize },
      createLocalDependencies(pool),
    );
    console.log(
      JSON.stringify(
        {
          ok: true,
          ...result,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
