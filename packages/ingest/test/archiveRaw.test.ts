import { PutObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { archiveObjectKey, createArchiveRaw } from "../src/archiveRaw.ts";
import type { OpenFdaPage } from "../src/types.ts";

const page: OpenFdaPage = {
  meta: { results: { skip: 0, limit: 100, total: 1 } },
  results: [{ recall_number: "D-0001-2026", status: "Ongoing" }],
};

describe("archiveObjectKey", () => {
  it("groups pages by day and avoids colons in the key", () => {
    const key = archiveObjectKey(
      { skip: 100, limit: 50 },
      new Date("2026-11-24T22:15:30.123Z"),
      "ingest/",
    );
    expect(key).toBe(
      "ingest/raw/2026-11-24/skip-100-limit-50-2026-11-24T22-15-30-123Z.json",
    );
  });
});

describe("createArchiveRaw", () => {
  it("puts the raw openFDA page on S3", async () => {
    const send = vi.fn().mockResolvedValue({});
    const archiveRaw = createArchiveRaw({
      client: { send },
      bucket: "fda-recall-archive",
      prefix: "ingest/",
      now: () => new Date("2026-11-24T22:15:30.123Z"),
    });

    await archiveRaw(page, { skip: 0, limit: 100 });

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0]?.[0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: "fda-recall-archive",
      Key: "ingest/raw/2026-11-24/skip-0-limit-100-2026-11-24T22-15-30-123Z.json",
      Body: JSON.stringify(page),
      ContentType: "application/json",
    });
  });

  it("propagates S3 failures", async () => {
    const send = vi.fn().mockRejectedValue(new Error("AccessDenied"));
    const archiveRaw = createArchiveRaw({
      client: { send },
      bucket: "fda-recall-archive",
    });

    await expect(archiveRaw(page, { skip: 0, limit: 10 })).rejects.toThrow(
      "AccessDenied",
    );
  });
});
