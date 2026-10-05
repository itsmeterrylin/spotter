# Spotter architecture

Spotter is an end-to-end evals platform for the product manager who owns an LLM product in production. It finds failures in production conversations, files them as issues, hands each confirmed issue to a coding agent, and checks that the fix worked. Agents drive Spotter over MCP. The UI is where a human confirms, dismisses, labels, and approves.

This page explains how the parts fit and why. The diagrams below show each stage. Each part is marked **today** if it exists in the code on `feat/skeleton`, or **planned** if it does not.

## Every failure is covered or uncovered

One question sorts every failure: does a written criterion exist for it?

- **Covered.** A criterion exists. A judge scores it on every sampled conversation.
- **Uncovered.** No criterion exists. The finder reads sampled conversations and reports problems that no judge checks.

A failure is one or the other, never both. The lifecycle runs one way: a PM confirms an uncovered issue and promotes it to a judge, and from then on the failure is covered.

A covered failure that a judge misses is still covered. That is a recall problem, and the PM measures it with human labels on that judge. It is not a third kind of failure.

The split holds only if the conversation record includes what happened after the conversation: the booking was completed, the guest escalated, the user gave a thumbs-down. Spotter stores these outcome and feedback events on the conversation. A failure that is not in the record is outside what Spotter can see.

## The loop has five stages

| Stage | What happens | Diagram |
|---|---|---|
| Ingest | Apps send conversations over OTLP or the traces API. Outcome and feedback arrive as events on the same conversation. | [Ingest](02-ingest.md) |
| Detect | One worker samples conversations under a daily budget. Live judges score them. The finder looks for uncovered failures and splits a judge's failures into distinct problems. | [Detect](03-detect.md) |
| Issues | Every finding becomes an issue or attaches to an existing one. A PM confirms or dismisses it. Dismissed issues never come back. | [Issue lifecycle](04-issue-lifecycle.md) |
| Fix | A coding agent reads the issue brief over MCP and opens a pull request. The PM approves it. The agent records the pull request and the release. | [Fix and verify](05-fix-and-verify.md) |
| Verify | Before release, CI replays the issue's inputs through the fixed build. After release, Spotter compares fail rates before and after the release. | [Fix and verify](05-fix-and-verify.md) |

A judge can open issues only after the PM calibrates it against human labels. [Judge calibration](06-judge-calibration.md) shows that gate. [Data model](07-data-model.md) shows the tables.

## Why the loop is built this way

**Findings are matched, not deduplicated by title.** The finder is a model, so it rewords the same problem every time. A title-based fingerprint would treat "Reply slips into Dutch" and "Assistant answers in Dutch" as two issues, and a dismissed issue would come back under new words. So the finder first chooses an existing issue or "new". The server then checks each "new" against open and dismissed issues before it inserts anything.

**A dismissed issue stays dismissed, and the PM can still see it recur.** When the finder matches a dismissed issue, Spotter adds nothing to the inbox. It increments a hit count and updates the last-seen time on the dismissed issue. If a dismissed issue shows 200 hits this week, the PM can reopen it. Only a human can reopen it.

**Pattern grouping is the finder, scoped to one judge's failures.** A judge's failures can hide several distinct problems. The finder runs over those failing conversations and files each distinct problem as an issue linked to that judge. This replaces a separate pattern stage, so the PM has one list to triage and one set of de-dupe rules.

**A judge must earn trust before it acts.** A judge promoted from one issue starts with a handful of positive examples and no negatives. Its false-alarm rate is unknown, so it stays a draft. It goes live after the PM labels a mixed queue of its passes and fails, and its true-positive and true-negative rates both clear 0.9 on held-out labels.

**Verify measures the fix, not the old transcripts.** A fix changes the product, not the conversations already stored. Judging the same transcripts again measures only judge noise. So verify has two parts. Before release, CI replays the issue's inputs through the fixed build and the judge scores the new outputs. After release, Spotter compares the judge's fail rate on conversations from the new release with the rate before it. It reports the sample size and an interval, and it says "not enough data" until both windows reach the minimum.

**A regression raises a flag, not an automatic reopen.** When the post-release rate breaches, Spotter marks the issue as a suspected regression and posts one webhook. The PM decides whether to reopen it.

**Cost has a ceiling.** Each project has a daily sample size and a daily token budget. The worker stops when the budget is spent, and the UI shows that state. Sampling hashes the conversation id, so a rerun picks the same conversations.

**Roles come from the token, not the request.** Spotter issues two kinds of bearer token, `human` and `agent`. The server reads the role from the token. An agent token can file issues, attach evidence, propose judge versions, and record fixes. Only a human token can confirm, dismiss, reopen, activate a judge, or write a human label.

**Transcripts are redacted before they leave.** Judges and the finder call any OpenAI-compatible endpoint, which can be a gateway or a single provider. A per-project redaction hook runs before every model call. A per-project allowlist limits which endpoints a project may use. Each score records the model and the endpoint, never the content.

## One page for the PM

The inbox is the PM's starting point each day. It holds three queues:

1. New issues to confirm or dismiss, each with example conversations.
2. Judges that need labels before they can go live, with the number still needed.
3. Issues in verifying, with the fail rate before and after the release.

## Infrastructure

| Part | Choice | Status |
|---|---|---|
| Database | SQLite in WAL mode, one process. The repo layer stays narrow so a Postgres port is mechanical when a second process exists. | Today |
| Worker | One loop in the server process. It claims rows from a `job` table. | Planned |
| Ingest | OTLP/HTTP JSON and the traces API (REST and MCP). An external sync job keeps its own cursor and upserts by conversation id. | Today |
| Model calls | Any OpenAI-compatible endpoint, set per project. | Today, CLI only |
| Alerts | One webhook with a JSON envelope. | Planned |
| Auth | Bearer tokens with `human` and `agent` roles. | Planned |

## Deferred

Spotter does not build these until a real need appears:

- Postgres, and a multi-worker job queue.
- An object store. Store an audio URL as a conversation attribute instead.
- OTLP protobuf.
- A server-stored sync cursor for warehouse jobs.
- OAuth for MCP.
- Monitors as a separate entity. Thresholds live on issues.
- Chat-format alert templates.
