# Spotter

The human in the loop for agent-run evals. Spotter is a local tool for LLM products: run a test set, score every result, compare runs by test case, and calibrate LLM judges against human review.

| Path | Contents |
|---|---|
| `docs/design/eval-tool-design.md` | Data model, API, SDK, review loop, judge validation |
| `design-system/` | Tokens, generated CSS, seven components, preview and clickable prototype |
| `docs/plans/2026-09-06-feature-eval-tool-skeleton.md` | Implementation plan: architecture, schema, API, MCP tools, deep links, phases |

## Preview

```bash
cd design-system && npm run build && open preview/index.html
```

## Dependency policy

Exact pins only. A version is adopted only after it has been public for 60 days. Bun enforces this with `minimumReleaseAge` in `bunfig.toml`; the design system checks it with `npm run check:deps`. Lockfiles are committed. Details in the plan's Stack section.

## Run locally

Requires Bun 1.3.9 (`.bun-version`) and Node 25 for the design system build.

```bash
bun install --frozen-lockfile
cd design-system && npm ci && npm run build && cd ..   # writes design-system/dist/spotter.css
bun run build:css                                      # copies it to app/public/spotter.css
bun run dev                                            # http://localhost:3000, /health, /api
```

| Command | Does |
|---|---|
| `bun run dev` | Starts the server with reload on change |
| `bun run start` | Starts the server once |
| `bun run check` | Type-checks `app` and `packages/evals` |
| `bun test` | Runs every test against an in-memory database |

| Variable | Default | Purpose |
|---|---|---|
| `SPOTTER_DB` | `./data/spotter.sqlite` | SQLite file; the only state |
| `SPOTTER_PORT` | `3000` | Listen port |
| `SPOTTER_BASE_URL` | `http://localhost:3000` | Origin used in every `url` field |
