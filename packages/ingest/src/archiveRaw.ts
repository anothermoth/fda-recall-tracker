import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import type { FetchPageParams, OpenFdaPage } from "./types.js";

export type ArchiveRawOptions = {
  client: Pick<S3Client, "send">;
  bucket: string;
  prefix?: string;
  now?: () => Date;
};

export function archiveObjectKey(
  params: FetchPageParams,
  at: Date,
  prefix = "",
): string {
  const day = at.toISOString().slice(0, 10);
  const stamp = at.toISOString().replace(/[:.]/g, "-");
  const base = `${prefix}raw/${day}/skip-${params.skip}-limit-${params.limit}-${stamp}.json`;
  return base.replace(/^\/+/, "");
}

/**
 * Build the `archiveRaw` hook that `runIngest` calls after each openFDA page.
 * The S3 client is injected so unit tests can mock `send`.
 */
export function createArchiveRaw(
  options: ArchiveRawOptions,
): (page: OpenFdaPage, params: FetchPageParams) => Promise<void> {
  const prefix = options.prefix ?? "";

  return async (page, params) => {
    const at = (options.now ?? (() => new Date()))();
    const key = archiveObjectKey(params, at, prefix);
    await options.client.send(
      new PutObjectCommand({
        Bucket: options.bucket,
        Key: key,
        Body: JSON.stringify(page),
        ContentType: "application/json",
      }),
    );
  };
}
