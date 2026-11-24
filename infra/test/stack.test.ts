import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { FdaRecallTrackerStack } from "../lib/fda-recall-tracker-stack.js";

const fixtureWeb = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/web");
const secretArn =
  "arn:aws:secretsmanager:us-east-1:123456789012:secret:fda-recall-tracker/database-url-AbCdEf";

function buildTemplate(): Template {
  const app = new cdk.App();
  const stack = new FdaRecallTrackerStack(app, "Test", {
    env: { account: "123456789012", region: "us-east-1" },
    databaseSecretArn: secretArn,
    webAssetPath: fixtureWeb,
  });
  return Template.fromStack(stack);
}

describe("FdaRecallTrackerStack", () => {
  it("creates an ingest Lambda on a daily EventBridge schedule", () => {
    const template = buildTemplate();

    template.hasResourceProperties("AWS::Lambda::Function", {
      Description: Match.stringLikeRegexp("openFDA ingest"),
      Runtime: "nodejs22.x",
      Timeout: 180,
      MemorySize: 512,
      Environment: {
        Variables: Match.objectLike({
          DATABASE_SECRET_ARN: secretArn,
          ARCHIVE_PREFIX: "ingest/",
          INGEST_LIMIT: "200",
        }),
      },
    });

    template.hasResourceProperties("AWS::Events::Rule", {
      ScheduleExpression: "cron(0 7 * * ? *)",
      State: "ENABLED",
    });
  });

  it("archives raw JSON to a private S3 bucket with a 90-day lifecycle", () => {
    const template = buildTemplate();

    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Status: "Enabled",
            ExpirationInDays: 90,
            Prefix: "ingest/raw/",
          }),
        ]),
      },
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              Match.stringLikeRegexp("s3:PutObject"),
            ]),
            Effect: "Allow",
          }),
        ]),
      },
    });
  });

  it("puts the Express API behind an HTTP API and CloudFront", () => {
    const template = buildTemplate();

    template.hasResourceProperties("AWS::Lambda::Function", {
      Description: Match.stringLikeRegexp("HTTP API"),
      Runtime: "nodejs22.x",
      Timeout: 15,
      MemorySize: 256,
    });

    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      ProtocolType: "HTTP",
      Name: "fda-recall-tracker-api",
    });

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Enabled: true,
        DefaultRootObject: "index.html",
        PriceClass: "PriceClass_100",
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({ PathPattern: "/recalls*" }),
          Match.objectLike({ PathPattern: "/health" }),
        ]),
        Origins: Match.arrayWith([
          Match.objectLike({
            CustomOriginConfig: Match.objectLike({
              OriginProtocolPolicy: "https-only",
            }),
          }),
        ]),
      }),
    });
  });

  it("grants both Lambdas permission to read the database secret", () => {
    const template = buildTemplate();
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              Match.stringLikeRegexp("secretsmanager:GetSecretValue"),
            ]),
            Effect: "Allow",
            Resource: secretArn,
          }),
        ]),
      },
    });
  });

  it("matches the sanitized CloudFormation snapshot", () => {
    const template = buildTemplate();
    expect(sanitizeTemplate(template.toJSON())).toMatchSnapshot();
  });
});

function sanitizeTemplate(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeTemplate);
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (key === "S3Key" || key === "SourceObjectKey" || key === "ContentSha256") {
        result[key] = "<asset-hash>";
        continue;
      }
      if (
        (key === "CurrentVersion" || key === "Custom") &&
        typeof entry === "string" &&
        /[0-9a-f]{8,}/i.test(entry)
      ) {
        result[key] = "<version>";
        continue;
      }
      result[key] = sanitizeTemplate(entry);
    }
    return result;
  }
  if (typeof value === "string") {
    return value.replace(/[0-9a-f]{16,}/gi, "<hash>");
  }
  return value;
}
