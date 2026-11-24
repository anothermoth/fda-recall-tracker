# Contributing

This is a public portfolio project, but the same review habits apply as they would on a team.

## Local development

```bash
cp .env.example .env
docker compose up -d
npm install
npm run migrate
npm run ingest -- --limit 200
npm run dev
```

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run synth
```

`npm run synth` needs a production build of the dashboard (`npm run build` already produced `packages/web/dist`). It does not need AWS credentials.

## Pull requests

Use the pull request template. The checklist is there to make review visible: tests, lint, no secrets, and a human pass over any AI-assisted changes.

## Using AI tools

AI pair-programming assistance is welcome. The person opening the PR still designs the change, reviews the diff, and is responsible for the code.
