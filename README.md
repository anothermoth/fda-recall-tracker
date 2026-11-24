# FDA Drug Recall Tracker

A public portfolio project that pulls open [FDA drug enforcement](https://open.fda.gov/apis/drug/enforcement/) recall data, stores it in Postgres, and serves it through a typed Express API and a React + TypeScript dashboard. Infrastructure is defined with AWS CDK: a scheduled ingest Lambda that archives raw JSON to S3, the API behind API Gateway, and the dashboard on S3 + CloudFront. Deploy is a GitHub Actions workflow that uses OIDC, not long-lived access keys.

The project is built so it can be talked through in a Senior Full Stack interview: how the ingest job pages a public API, how the Lambda and API Gateway pieces fit together, how the dashboard keeps filters in the URL, and how CI/CD runs without storing AWS keys in the repo.

![The dashboard showing search filters and a paginated list of recent FDA drug recalls](docs/dashboard.png)

## Architecture

```mermaid
flowchart LR
  subgraph sources [Source]
    FDA[openFDA drug enforcement API]
  end

  subgraph aws [AWS]
    Events[EventBridge daily schedule]
    IngestLambda[Ingest Lambda]
    S3Archive[(S3 raw JSON archive)]
    APIGW[API Gateway HTTP API]
    ApiLambda[API Lambda]
    Secrets[Secrets Manager]
    WebBucket[(S3 web assets)]
    CF[CloudFront]
  end

  subgraph data [Data]
    PG[(Postgres on Neon or RDS)]
  end

  subgraph local [Local]
    CLI[Ingest CLI]
    Core["runIngest() pure core"]
    DevAPI[Express API]
    DevWeb[Vite dashboard]
  end

  Events --> IngestLambda
  IngestLambda --> Core
  CLI --> Core
  Core --> FDA
  Core --> PG
  IngestLambda --> S3Archive
  IngestLambda --> Secrets
  ApiLambda --> Secrets
  APIGW --> ApiLambda
  ApiLambda --> PG
  CF --> WebBucket
  CF --> APIGW
  DevWeb --> DevAPI
  DevAPI --> PG
```

The ingest core is a pure function. The local CLI and the Lambda handler supply HTTP, database, and (in AWS) S3 dependencies. That keeps the paging and upsert logic testable without AWS credentials.

In production, CloudFront serves the dashboard from S3 and forwards `/recalls` and `/health` to API Gateway on the same domain. The React detail route is `/recall/:id` (singular) so it does not collide with the API. Locally, Vite proxies those API paths to the Express server. Filters live in the URL, so a search is shareable and the back button works.

This stack does not provision a database. A [Neon](https://neon.tech/) free-tier project (or an existing RDS instance) keeps AWS cost close to zero. Lambdas read the connection string from Secrets Manager.

## Local setup

Prerequisites: Node.js 20+ (22 is what CI uses) and Docker, or any local Postgres 16+ you already have.

```bash
git clone https://github.com/anothermoth/fda-recall-tracker.git
cd fda-recall-tracker
cp .env.example .env
docker compose up -d
npm install
npm run migrate
npm run ingest -- --limit 200
npm run dev
```

`npm run dev` starts the API on `http://127.0.0.1:3001` and the dashboard on `http://127.0.0.1:5173`. You can also start them separately with `npm run dev:api` and `npm run dev:web`.

```bash
curl http://127.0.0.1:3001/health
curl "http://127.0.0.1:3001/recalls?q=ibuprofen&classification=Class%20II&limit=5"
curl http://127.0.0.1:3001/recalls/D-0145-2027
```

`GET /recalls` accepts:

| Query param | Meaning |
| --- | --- |
| `q` | Full-text search over product description and reason |
| `classification` | Exact match (`Class I`, `Class II`, `Class III`) |
| `state` | Exact match on the recalling firm's state |
| `from`, `to` | Inclusive `report_date` range (`YYYY-MM-DD`) |
| `limit`, `offset` | Pagination (`limit` defaults to 20, max 100) |

If you would rather not use Docker, create a database that matches `DATABASE_URL` in `.env` and run the same migrate / ingest / dev commands.

### Useful scripts

| Script | What it does |
| --- | --- |
| `npm run migrate` | Apply numbered SQL files in `db/migrations/` |
| `npm run ingest -- --limit 200` | Fetch the latest N openFDA records and upsert them |
| `npm run dev` | Start the API and the Vite dashboard together |
| `npm run dev:api` | Start only the API, with reload |
| `npm run dev:web` | Start only the dashboard (proxies API requests) |
| `npm test` | Unit, component, API, and CDK tests |
| `npm run typecheck` | `tsc --noEmit` in each package |
| `npm run lint` | ESLint across the repo |
| `npm run build` | Build every package, including the dashboard |
| `npm run synth` | Synthesize the CDK app (no AWS credentials needed) |

## Deploying to AWS

The CDK app lives in `infra/`. It defines:

- An ingest Lambda, scheduled daily at 07:00 UTC by EventBridge, that wraps `runIngest` and writes each raw openFDA page to S3 (objects expire after 90 days)
- The Express API as a Lambda behind an API Gateway HTTP API
- The Vite build on a private S3 bucket, served through CloudFront (`PriceClass_100`)
- A reference to an existing Secrets Manager secret for `DATABASE_URL` — no RDS instance is created

`cdk synth` runs in CI without credentials. The GitHub Actions **Deploy** workflow (`.github/workflows/deploy.yml`) also starts on every push to `main` and on `workflow_dispatch`. It assumes an IAM role with GitHub OIDC. If the `AWS_DEPLOY_ROLE_ARN` secret is not set, the workflow skips the AWS steps and still exits green.

OIDC is used instead of long-lived access keys so GitHub never stores an AWS secret that can leak from the repo or a log. GitHub presents a short-lived token, and the IAM role's trust policy accepts it only from this repository.

### First real deploy

You will need an AWS account and a Postgres URL. A Neon free-tier database is enough.

1. **Create the database.** In [Neon](https://neon.tech/), create a project, copy the connection string (it should include `sslmode=require`), then from this repo run `DATABASE_URL='postgres://...' npm run migrate`. You can also run `npm run ingest -- --limit 200` once so the first dashboard load has data.

2. **Store the URL in Secrets Manager** (this is about $0.40/month, the only standing AWS cost besides a few pennies of Lambda/S3/CloudFront if you leave it running):

   ```bash
   aws secretsmanager create-secret \
     --name fda-recall-tracker/database-url \
     --secret-string 'postgres://USER:PASSWORD@HOST/dbname?sslmode=require' \
     --region us-east-1
   ```

   Save the secret ARN from the command output. The secret can also be JSON with a `DATABASE_URL` field, or the standard `host` / `username` / `password` / `dbname` fields.

3. **Bootstrap CDK** in the account and region you will deploy to (once per account/region):

   ```bash
   cd infra
   npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
   ```

4. **Create the GitHub OIDC identity provider** in IAM if the account does not already have one (IAM → Identity providers → `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`).

5. **Create an IAM role** for GitHub Actions. Trust policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:anothermoth/fda-recall-tracker:*"
           }
         }
       }
     ]
   }
   ```

   Attach a policy that can deploy this CDK stack (CloudFormation, Lambda, API Gateway, S3, CloudFront, EventBridge, IAM role management, Logs, and Secrets Manager read). The role also needs the permissions CDK bootstrap granted to the deployment role, including access to the CDK asset buckets.

6. **Add GitHub secrets and variables** in the repository settings:

   | Name | Type | Value |
   | --- | --- | --- |
   | `AWS_DEPLOY_ROLE_ARN` | Secret | ARN of the IAM role from step 5 |
   | `DATABASE_SECRET_ARN` | Secret | ARN (or name) of the secret from step 2 |
   | `AWS_ACCOUNT_ID` | Variable | Your 12-digit account id |
   | `AWS_REGION` | Variable | `us-east-1` unless you bootstrapped a different region |

7. **Run the Deploy workflow** from the Actions tab (`workflow_dispatch`), or push to `main`. The first CloudFormation deploy can take several minutes. The stack outputs `CloudFrontUrl` (the dashboard) and `ApiUrl`.

To tear the stack down and stop AWS charges: `npm run destroy -w @fda-recall-tracker/infra`. Buckets are created with `RemovalPolicy.DESTROY` so a destroy can finish cleanly.

## Repository layout

```
packages/api       Express + TypeScript REST API (local server and Lambda handler)
packages/ingest    openFDA fetch, mapping, upsert, S3 archive, and Lambda handler
packages/web       Vite + React + TypeScript dashboard
infra              AWS CDK app, tests, and stack definition
db/migrations      Plain, numbered SQL
docs/dashboard.png Dashboard screenshot
```

## Roadmap

- [x] **Step 1** — Monorepo, Postgres schema and indexes, ingest CLI, Express API, tests, and GitHub Actions CI
- [x] **Step 2** — React + TypeScript (Vite) dashboard for search, filters, and recall detail
- [x] **Step 3** — AWS CDK (ingest Lambda, API Gateway, S3, CloudFront) and GitHub OIDC deploy — deploy itself is pending an AWS account
- [ ] **Step 4** — Production hardening: tighter IAM, structured logging, and a custom domain
- [ ] Optional later — Expand `docs/database.md` with `EXPLAIN` plans and a backup/restore runbook

## Using AI tools

I build this project with AI pair-programming tools, the same kind of Copilot- or Claude-style assistants used on many teams. I set the design, review every change, and run the tests before anything is merged. The [pull request template](.github/PULL_REQUEST_TEMPLATE.md) has a review checklist so that practice is visible in the repo. I am responsible for the code.

## License

[MIT](./LICENSE)
