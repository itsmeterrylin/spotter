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
| `read` | `{type: 'run' \| 'trace' \| 'dataset' \| 'judge' \| 'audit' \| 'attribute_map', id?}` | one object with `url`; `audit` returns counts |
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

## OpenTelemetry

`POST /api/otel/v1/traces` accepts OTLP/HTTP JSON. A protobuf body (`application/x-protobuf`) answers 415; the app takes no protobuf decoder yet. Point an OTel exporter at the JSON protocol:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3000/api/otel
OTEL_EXPORTER_OTLP_PROTOCOL=http/json
```

One OTel trace becomes one Spotter trace. Spans that arrive in later batches merge into it by trace id (attributes, events, spans, tokens, end). The response is `{accepted, traces: [{id, url}], url}`.

| OTLP | Spotter trace |
|---|---|
| resource or span attribute `spotter.project`, else `service.name`, else `default` | `project` |
| attributes `spotter.run_id`, `spotter.dataset_item_id` | `run_id`, `dataset_item_id` |
| `gen_ai.input.messages` then `gen_ai.output.messages` (JSON strings or arrays; `parts` text is joined) | `messages[] {turn, role, content}` |
| `gen_ai.prompt`, `gen_ai.completion` (JSON strings are parsed) | `input`, `output`; absent, the first user and last assistant message |
| `gen_ai.usage.input_tokens` or `prompt_tokens`, `gen_ai.usage.output_tokens` or `completion_tokens`, summed over spans | `metrics.prompt_tokens`, `metrics.completion_tokens` |
| earliest span start, latest span end (nanoseconds) | `start`, `end` |
| every resource and span attribute, raw | `metadata.attributes[name]`; the project's attribute map then promotes chosen ones to `metadata.<target>` |
| span events | `events[] {at, name, data}` |
| spans | `spans[] {span_id, parent_id, name, start, end, attributes}` |

The `gen_ai.*` values are read from the root span when it has them, else from the latest span that does.

Example body:

```json
{
  "resourceSpans": [{
    "resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "voice"}}]},
    "scopeSpans": [{"spans": [
      {"traceId": "5b8efff798038103d269b633813fc60c", "spanId": "aaaa", "name": "session",
       "startTimeUnixNano": "1789293600000000000", "endTimeUnixNano": "1789293605000000000",
       "attributes": [{"key": "lk.transfer.destination", "value": {"stringValue": "+1555"}}],
       "events": [{"timeUnixNano": "1789293604000000000", "name": "transfer_initiated"}]},
      {"traceId": "5b8efff798038103d269b633813fc60c", "spanId": "bbbb", "parentSpanId": "aaaa", "name": "chat gpt-x",
       "startTimeUnixNano": "1789293601000000000", "endTimeUnixNano": "1789293603000000000",
       "attributes": [
         {"key": "gen_ai.input.messages", "value": {"stringValue": "[{\"role\":\"user\",\"parts\":[{\"type\":\"text\",\"content\":\"Weather in Paris?\"}]}]"}},
         {"key": "gen_ai.output.messages", "value": {"stringValue": "[{\"role\":\"assistant\",\"parts\":[{\"type\":\"text\",\"content\":\"Rainy.\"}]}]"}},
         {"key": "gen_ai.usage.input_tokens", "value": {"intValue": "12"}},
         {"key": "gen_ai.usage.output_tokens", "value": {"intValue": "5"}}
       ]}
    ]}]
  }]
}
```

Set the attribute map first so promoted keys exist on arrival: `PUT /api/projects/voice/attribute-map` with `[{"source": "lk.transfer.destination", "target": "transfer_to", "type": "string"}]`, or MCP `write attribute_map.set`.

## Run your first eval

The SDK runs the task and the scores on your machine and posts traces to the server. The server never runs the task.

```bash
bun run dev                                                    # start the server on :3000
bun spotter run evals/tagging.example.ts --create              # seed the dataset, run rules v1, print the run url
TAGGING_RULES=v2 bun spotter run evals/tagging.example.ts      # run rules v2, compare against the previous run
```

The second run prints a table with mean, diff, improvements, and regressions per score, then the run url and the compare url. Runs are named `<file> #<n>`, plus the value of any env var listed in the eval's `metadata.variant_env`, for example `tagging.example #2 (v2)`; pass `--name <text>` to name a run yourself. The baseline run id is recorded as `metadata.baseline`. Pass `--baseline <run_id>` to pick the baseline, `--no-send` to print the means without a server, or `spotter compare <baseline> <run>` for two existing runs. `bun spotter init` writes `evals/<name>.ts` from three answers and runs it once.

| Variable | Default | Purpose |
|---|---|---|
| `SPOTTER_URL` | `http://localhost:3000` | Server the SDK posts to |
| `SPOTTER_AUTH_TOKEN` | unset | Sent as a bearer token when set |
