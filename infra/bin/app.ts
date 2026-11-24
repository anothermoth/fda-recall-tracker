#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { FdaRecallTrackerStack } from "../lib/fda-recall-tracker-stack.js";

const app = new cdk.App();

const account =
  process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID ?? "000000000000";
const region =
  process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1";

// Used at synth/CI time when no real secret exists. Deploy sets
// DATABASE_SECRET_ARN to a secret you created in the account.
const databaseSecretArn =
  process.env.DATABASE_SECRET_ARN ??
  `arn:aws:secretsmanager:${region}:${account}:secret:fda-recall-tracker/database-url-AbCdEf`;

new FdaRecallTrackerStack(app, "FdaRecallTracker", {
  env: { account, region },
  databaseSecretArn,
  description:
    "FDA Drug Recall Tracker — ingest Lambda, HTTP API, and CloudFront dashboard",
});
