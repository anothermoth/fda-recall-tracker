# @fda-recall-tracker/web

React + TypeScript dashboard (Vite) for searching and inspecting FDA drug recalls.

```bash
# from the repo root, with the API already running on port 3001
npm run dev:web
```

The Vite dev server proxies `/recalls` and `/health` to the API, so you can open `http://127.0.0.1:5173/` without configuring CORS. For a production build, set `VITE_API_BASE_URL` to the API origin. See the root README for the full local setup.
