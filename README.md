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

## MCP

The same service layer as REST, mounted at `/mcp` over Streamable HTTP. The server is stateless, so no session header is needed.

```bash
claude mcp add --transport http spotter http://localhost:3000/mcp
```

| Tool | Input | Returns |
|---|---|---|
| `list` | `{type: 'datasets' \| 'items' \| 'runs' \| 'traces' \| 'notes' \| 'judges' \| 'disagreements' \| 'alerts' \| 'deliveries', filters?, dataset_id?, run_id?, judge?, version?, limit?}` | `{items, url}`; every row carries `url` |
| `read` | `{type: 'run' \| 'trace' \| 'dataset' \| 'judge' \| 'audit', id?}` | one object with `url`; `audit` returns counts |
| `write` | `{op: 'dataset.create' \| 'items.upsert' \| 'run.create' \| 'traces.insert' \| 'trace.patch_metadata' \| 'scores.put' \| ..., data, dry_run?}` | `{ok, ids, url}` |
| `compare` | `{dataset_id, run_ids, only?: 'changes'}` | items with per-run cells, per-score summary, `url` |

Ops and types that belong to a later phase return `{ok: false, note: 'available after phase N'}` or `{items: [], note}`.

Example call with plain HTTP:

```bash
curl -s http://localhost:3000/mcp -H 'content-type: application/json' -H 'accept: application/json' -d '{
  "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": {"name": "compare", "arguments": {"dataset_id": "<dataset>", "run_ids": ["<baseline>", "<candidate>"], "only": "changes"}}
}'
```

The agent-facing guide, with the loop and the deep-link contract, is `skills/spotter.md`.

## Run your first eval

The SDK runs the task and the scores on your machine and posts traces to the server. The server never runs the task.

```bash
bun run dev                                                    # start the server on :3000
bun spotter run evals/tagging.example.ts --create              # seed the dataset, run rules v1, print the run url
TAGGING_RULES=v2 bun spotter run evals/tagging.example.ts      # run rules v2, compare against the previous run
```

The second run prints a table with mean, diff, improvements, and regressions per score, then the run url and the compare url. Pass `--baseline <run_id>` to pick the baseline, `--no-send` to print the means without a server, or `spotter compare <baseline> <run>` for two existing runs. `bun spotter init` writes `evals/<name>.ts` from three answers and runs it once.

| Variable | Default | Purpose |
|---|---|---|
| `SPOTTER_URL` | `http://localhost:3000` | Server the SDK posts to |
| `SPOTTER_AUTH_TOKEN` | unset | Sent as a bearer token when set |
