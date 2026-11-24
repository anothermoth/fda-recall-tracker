import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export interface FdaRecallTrackerStackProps extends cdk.StackProps {
  /**
   * Secrets Manager secret name or complete ARN. The secret value is a
   * Postgres connection string, a JSON object with DATABASE_URL, or the
   * standard host/username/password/dbname fields.
   *
   * This stack does not provision a database. Use a free Neon project
   * (or an existing RDS instance) and keep the URL in Secrets Manager
   * so Lambda never stores the password in environment variables.
   */
  databaseSecretArn: string;
  /** Directory of the Vite production build. Defaults to packages/web/dist. */
  webAssetPath?: string;
}

export class FdaRecallTrackerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FdaRecallTrackerStackProps) {
    super(scope, id, props);

    const databaseSecret = importDatabaseSecret(this, "DatabaseUrl", props.databaseSecretArn);
    const webAssetPath = props.webAssetPath ?? path.join(repoRoot, "packages/web/dist");

    const archiveBucket = new s3.Bucket(this, "ArchiveBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          id: "ExpireRawJsonAfter90Days",
          prefix: "ingest/raw/",
          expiration: cdk.Duration.days(90),
        },
      ],
    });

    const ingestFn = new NodejsFunction(this, "IngestFunction", {
      description:
        "Daily openFDA ingest: upsert recalls into Postgres and archive raw JSON to S3",
      entry: path.join(repoRoot, "packages/ingest/src/lambda.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 512,
      timeout: cdk.Duration.minutes(3),
      depsLockFilePath: path.join(repoRoot, "package-lock.json"),
      projectRoot: repoRoot,
      bundling: lambdaBundling(),
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        DATABASE_SECRET_ARN: props.databaseSecretArn,
        ARCHIVE_BUCKET: archiveBucket.bucketName,
        ARCHIVE_PREFIX: "ingest/",
        INGEST_LIMIT: "200",
      },
    });
    databaseSecret.grantRead(ingestFn);
    archiveBucket.grantPut(ingestFn, "ingest/*");

    new events.Rule(this, "DailyIngestRule", {
      description: "Run the FDA recall ingest once a day at 07:00 UTC",
      schedule: events.Schedule.cron({ minute: "0", hour: "7" }),
    }).addTarget(
      new targets.LambdaFunction(ingestFn, {
        event: events.RuleTargetInput.fromObject({ limit: 200 }),
        retryAttempts: 2,
      }),
    );

    const apiFn = new NodejsFunction(this, "ApiFunction", {
      description: "FDA recall tracker HTTP API (Express wrapped with serverless-http)",
      entry: path.join(repoRoot, "packages/api/src/lambda.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      depsLockFilePath: path.join(repoRoot, "package-lock.json"),
      projectRoot: repoRoot,
      bundling: lambdaBundling(),
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        DATABASE_SECRET_ARN: props.databaseSecretArn,
      },
    });
    databaseSecret.grantRead(apiFn);

    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: "fda-recall-tracker-api",
      description: "FDA drug recall REST API",
      defaultIntegration: new HttpLambdaIntegration("ApiIntegration", apiFn),
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.HEAD,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type", "Accept"],
        maxAge: cdk.Duration.days(1),
      },
    });

    const webBucket = new s3.Bucket(this, "WebBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const spaRouting = new cloudfront.Function(this, "SpaRouting", {
      comment: "Serve the Vite SPA for frontend routes such as /recall/:id",
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(SPA_ROUTING_FUNCTION),
    });

    const apiOrigin = new origins.HttpOrigin(
      `${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`,
      {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      },
    );

    const apiBehavior: cloudfront.BehaviorOptions = {
      origin: apiOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    };

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: "FDA Drug Recall Tracker dashboard",
      defaultRootObject: "index.html",
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        functionAssociations: [
          {
            function: spaRouting,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        // The React detail route is /recall/:id (singular) so these
        // API paths can share the same domain without colliding.
        "/recalls*": apiBehavior,
        "/health": apiBehavior,
      },
    });

    new s3deploy.BucketDeployment(this, "DeployWeb", {
      sources: [s3deploy.Source.asset(webAssetPath)],
      destinationBucket: webBucket,
      distribution,
      distributionPaths: ["/*"],
      memoryLimit: 256,
    });

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      description: "Dashboard URL",
      value: `https://${distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, "ApiUrl", {
      description: "API Gateway URL (also available under the CloudFront domain at /recalls and /health)",
      value: httpApi.apiEndpoint,
    });
    new cdk.CfnOutput(this, "ArchiveBucketName", {
      description: "S3 bucket for raw openFDA JSON",
      value: archiveBucket.bucketName,
    });
    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    cdk.Tags.of(this).add("Project", "fda-recall-tracker");
  }
}

function lambdaBundling() {
  return {
    format: OutputFormat.CJS,
    target: "node22",
    minify: true,
    sourceMap: true,
  };
}

function importDatabaseSecret(
  scope: Construct,
  id: string,
  ref: string,
): secretsmanager.ISecret {
  if (ref.startsWith("arn:aws:secretsmanager:")) {
    return secretsmanager.Secret.fromSecretCompleteArn(scope, id, ref);
  }
  return secretsmanager.Secret.fromSecretNameV2(scope, id, ref);
}

const SPA_ROUTING_FUNCTION = `
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri === "/" || uri.indexOf(".") !== -1) {
    return request;
  }
  request.uri = "/index.html";
  return request;
}
`.trim();
