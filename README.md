# Copper Evaluations

A local eval tool for LLM products: run a test set, score every result, compare runs by test case, and calibrate LLM judges against human review.

| Path | Contents |
|---|---|
| `docs/design/eval-tool-design.md` | Data model, API, SDK, review loop, judge validation |
| `design-system/` | Tokens and component contracts in TypeScript, generated CSS, preview page |
| `docs/plans/2026-09-06-feature-eval-tool-skeleton.md` | Implementation plan: architecture, schema, API, MCP tools, deep links, phases |

## Preview

```bash
cd design-system && npm run build && open preview/index.html
```
