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
