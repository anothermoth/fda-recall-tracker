import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

export function parseSecretToDatabaseUrl(secretString: string): string {
  const trimmed = secretString.trim();
  if (!trimmed) {
    throw new Error("Database secret is empty");
  }
  if (!trimmed.startsWith("{")) {
    return trimmed;
  }

  const parsed = JSON.parse(trimmed) as Record<string, unknown>;
  const direct = firstString(parsed, [
    "DATABASE_URL",
    "database_url",
    "url",
    "connectionString",
    "connection_string",
  ]);
  if (direct) {
    return direct;
  }

  const host = firstString(parsed, ["host", "hostname"]);
  const user = firstString(parsed, ["username", "user"]);
  const password = firstString(parsed, ["password"]);
  const dbname = firstString(parsed, ["dbname", "database", "db"]);
  const port = firstString(parsed, ["port"]) ?? "5432";
  if (host && user && dbname) {
    const auth = `${encodeURIComponent(user)}${password !== undefined ? `:${encodeURIComponent(password)}` : ""}`;
    const sslmode = firstString(parsed, ["sslmode"]) ?? "require";
    return `postgres://${auth}@${host}:${port}/${dbname}?sslmode=${sslmode}`;
  }

  throw new Error(
    "Secret JSON must include DATABASE_URL or the standard host/username/dbname fields",
  );
}

function firstString(
  source: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return undefined;
}

export async function resolveDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
  client: Pick<SecretsManagerClient, "send"> = new SecretsManagerClient({}),
): Promise<string> {
  const fromEnv = env.DATABASE_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const secretId = env.DATABASE_SECRET_ARN?.trim();
  if (!secretId) {
    throw new Error("DATABASE_URL or DATABASE_SECRET_ARN is required");
  }

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );
  const secretString = response.SecretString;
  if (!secretString) {
    throw new Error(`Secret ${secretId} did not contain a string value`);
  }
  return parseSecretToDatabaseUrl(secretString);
}
