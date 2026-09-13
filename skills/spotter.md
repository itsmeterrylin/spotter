---
name: spotter
description: Run evals through Spotter's MCP tools, compare runs, and send the person deep links to verify, label, and calibrate. Use when a task touches datasets, runs, traces, scores, or judges in Spotter.
---

# Spotter

Spotter is the human in the loop for agent-run evals. You run the eval and write the results. A person opens the links you send to verify, label, and calibrate. Do not use the UI to do work; use it only to check that a link shows what you claim.

## The loop

1. Create or reuse a dataset and its items.
2. Create a run, execute the task locally, and write one trace per item with SDK scores.
3. Compare the new run to the baseline run. Read `improvements` and `regressions` per score.
4. Send the person the compare url and the run url. Say which items changed and why you think so.
5. The person labels traces (pass, fail, defer) and writes notes. Read them with `list notes`.
6. Group notes into failure modes. Propose one judge per failure mode, then calibrate it against the human labels before its scores count. Judge tools arrive in phase 6.

## Connect

```bash
claude mcp add --transport http spotter http://localhost:3000/mcp
```

The server is stateless. Every request may be a fresh connection. No session header is needed.

## Tools

Every successful result carries `url`. Every list row carries `url`. Errors come back as `{error: {code, message}}` with `isError: true`.

### list

```
{type: 'datasets' | 'items' | 'runs' | 'traces' | 'notes' | 'judges' | 'disagreements' | 'alerts' | 'deliveries',
 filters?: [{field, key?, operator, value?}], dataset_id?, run_id?, judge?, version?, limit?}
```

- `items` needs `dataset_id`. `runs` accepts `dataset_id`. `traces` and `notes` accept `run_id` and `filters`.
- `notes` returns human scores that have a reason, each with its trace, so you can cluster failure modes.
- `filters` fields: `id`, `run_id`, `dataset_item_id`, `start`, `end`, `metadata.<key>`, `tags`, `events`, `source`, `score` (with `key` = score name). Operators: `=`, `!=`, `<`, `<=`, `>`, `>=`, `contains`, `starts_with`, `in`, `is_empty`.
- `judges`, `disagreements`, `alerts`, `deliveries` return `{items: [], note: 'available after phase N'}` until that phase ships.

### read

```
{type: 'run' | 'trace' | 'dataset' | 'judge' | 'audit', id?}
```

- `run` returns the run with `aggregates` (trace count, per-score mean, p50 duration, tokens).
- `trace` returns the trace with its `scores`.
- `dataset` returns the dataset with `item_count` and its `runs`.
- `audit` returns counts: `datasets`, `runs`, `traces`, `human_labels`, `runs_without_baseline`, `datasets_without_runs`. Call it first when you do not know the state of the server.

### write

```
{op, data, dry_run?}
```

| op | data |
|---|---|
| `dataset.create` | `{project, name, description?, purpose?}` |
| `items.upsert` | `{dataset_id, items: [{id, input, expected?, metadata?, tags?}]}` |
| `run.create` | `{dataset_id, name, metadata?}` |
| `traces.insert` | `{traces: [{id, project, run_id?, dataset_item_id?, input, output, expected?, start, end?, metrics?, scores?: [{name, value, source}]}]}` |
| `trace.patch_metadata` | `{trace_id, metadata?, events?}` |
| `scores.put` | `{trace_id, scores: [{name, value or verdict, reason?, source}]}` |

- `dry_run: true` validates `data` and returns `{ok: true, dry_run: true}` without writing.
- Set `metadata.baseline` on a run to the run id you compare against. `read audit` counts runs that lack it.
- Trace ids are yours. Insert is idempotent by id: a repeat reports `skipped`.
- `items.from_traces`, `judge.propose`, `judge.activate`, `alert.create`, `alert.test` return `{ok: false, note}` until their phase ships.

### compare

```
{dataset_id, run_ids: [baseline, candidate], only?: 'changes'}
```

Returns `items` with one cell per run (output, scores, trace url), `summary` per score (means per run, `diff`, `improvements`, `regressions`), and the compare page `url`. Pass `only: 'changes'` to get only the items whose scores differ.

## Deep links

Send these to the person. A link opened in a fresh tab shows the same state it showed when copied.

| Object | URL |
|---|---|
| Run | `/runs/{run_id}?score={name}` |
| Compare | `/datasets/{dataset_id}/compare?runs={a},{b}&only=changes&score={name}` |
| Trace | `/traces/{trace_id}?turn={n}` |
| Dataset items | `/datasets/{dataset_id}/items?tag={tag}` |
| Dataset item across runs | `/datasets/{dataset_id}/items/{item_id}` |
| Review queue | `/review?run={run_id}&filter=unlabeled` |
| Review one trace | `/review/{trace_id}?run={run_id}` |
| Judge | `/judges/{name}`, `/judges/{name}/versions/{n}`, `/judges/{name}/disagreements?version={n}` |

Use the `url` field from a result instead of building a link by hand. The origin comes from `SPOTTER_BASE_URL`.

## Rules

- Write through the tools. Never edit the SQLite file.
- A judge's scores count only after it is calibrated against human labels.
- When you report a regression, include the compare url and the trace url of at least one regressed item.
