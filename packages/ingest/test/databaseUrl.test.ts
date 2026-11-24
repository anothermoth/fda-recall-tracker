import { describe, expect, it, vi } from "vitest";
import {
  parseSecretToDatabaseUrl,
  resolveDatabaseUrl,
} from "../src/databaseUrl.ts";

describe("parseSecretToDatabaseUrl", () => {
  it("accepts a plain connection string", () => {
    expect(parseSecretToDatabaseUrl("  postgres://fda:fda@localhost/fda  ")).toBe(
      "postgres://fda:fda@localhost/fda",
    );
  });

  it("reads DATABASE_URL from a JSON secret", () => {
    expect(
      parseSecretToDatabaseUrl(
        JSON.stringify({ DATABASE_URL: "postgres://fda@localhost/fda_recalls" }),
      ),
    ).toBe("postgres://fda@localhost/fda_recalls");
  });

  it("builds a URL from the standard RDS/Secrets Manager fields", () => {
    expect(
      parseSecretToDatabaseUrl(
        JSON.stringify({
          host: "db.example.com",
          username: "fda",
          password: "p@ss/word",
          dbname: "fda_recalls",
          port: 5432,
        }),
      ),
    ).toBe(
      "postgres://fda:p%40ss%2Fword@db.example.com:5432/fda_recalls?sslmode=require",
    );
  });

  it("rejects JSON that has no usable fields", () => {
    expect(() => parseSecretToDatabaseUrl(JSON.stringify({ foo: "bar" }))).toThrow(
      /DATABASE_URL/,
    );
  });
});

describe("resolveDatabaseUrl", () => {
  it("prefers DATABASE_URL so local development stays simple", async () => {
    const send = vi.fn();
    await expect(
      resolveDatabaseUrl(
        { DATABASE_URL: "postgres://local", DATABASE_SECRET_ARN: "arn:secret" },
        { send },
      ),
    ).resolves.toBe("postgres://local");
    expect(send).not.toHaveBeenCalled();
  });

  it("loads a Secrets Manager ARN when DATABASE_URL is unset", async () => {
    const send = vi.fn().mockResolvedValue({
      SecretString: JSON.stringify({ url: "postgres://from-secret" }),
    });

    await expect(
      resolveDatabaseUrl({ DATABASE_SECRET_ARN: "arn:secret" }, { send }),
    ).resolves.toBe("postgres://from-secret");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("fails clearly when neither source is configured", async () => {
    await expect(resolveDatabaseUrl({}, { send: vi.fn() })).rejects.toThrow(
      /DATABASE_URL or DATABASE_SECRET_ARN/,
    );
  });
});
