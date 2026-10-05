import { parseMaybeJson } from '../db/json.ts';
import type { Repos } from '../db/repos/index.ts';
import type { NewScore, Score } from '../db/repos/score.ts';
import type { NewTrace, Trace } from '../db/repos/trace.ts';
import type { Json, JsonObject, ScoreSource, TraceEvent } from '../db/types.ts';
import { notFound } from '../errors.ts';
import { urls } from '../urls.ts';
import { promote } from './attributeMap.ts';
import { toWhere, type Filter } from './filters.ts';

export type TraceView = Trace & { scores: Score[]; url: string };
export type TraceInput = Omit<NewTrace, 'project_id'> & { project: string; scores?: NewScore[] };
export type BatchResult = { inserted: number; skipped: number; urls: string[]; url: string };
export type TraceListQuery = { filters: Filter[]; run_id?: string; limit: number; cursor?: string };
export type TracePage = { traces: TraceView[]; next_cursor: string | null; url: string };

const view = (repos: Repos, trace: Trace): TraceView => ({ ...trace, scores: repos.scores.listByTrace(trace.id), url: urls.trace(trace.id) });

export function getTrace(repos: Repos, id: string): TraceView {
  const trace = repos.traces.get(id);
  if (!trace) throw notFound('trace', id);
  return view(repos, trace);
}

const distinct = (xs: Array<string | null | undefined>): string[] => [...new Set(xs.filter((x): x is string => typeof x === 'string'))];

export function insertBatch(repos: Repos, traces: TraceInput[]): BatchResult {
  for (const id of distinct(traces.map((t) => t.run_id))) if (!repos.runs.get(id)) throw notFound('run', id);
  for (const id of distinct(traces.map((t) => t.dataset_item_id))) if (!repos.datasets.getItem(id)) throw notFound('dataset item', id);
  const projects = new Map(distinct(traces.map((t) => t.project)).map((name) => [name, repos.projects.ensure(name).id]));
  const maps = new Map([...projects].map(([name, id]) => [name, repos.attributeMaps.list(id)]));
  const result = repos.tx(() => {
    let inserted = 0;
    for (const { project, scores, ...rest } of traces.map(transcriptDefaults)) {
      const metadata = promote(maps.get(project) ?? [], rest.metadata ?? null, rest.events ?? null);
      const row: NewTrace = { ...rest, metadata, project_id: projects.get(project) ?? '' };
      if (!repos.traces.insert(row)) continue;
      inserted += 1;
      if (scores?.length) repos.scores.insertMany(row.id, scores);
    }
    return inserted;
  });
  const runs = distinct(traces.map((t) => t.run_id));
  const url = runs.length === 1 && runs[0] ? urls.run(runs[0]) : urls.traces();
  return { inserted: result, skipped: traces.length - result, urls: traces.map((t) => urls.trace(t.id)), url };
}

const transcriptDefaults = (t: TraceInput): TraceInput => {
  if (!t.messages?.length) return t;
  const first = t.messages.find((m) => m.role === 'user');
  const last = [...t.messages].reverse().find((m) => m.role === 'assistant');
  return { ...t, input: t.input ?? parseMaybeJson(first?.content ?? null), output: t.output ?? parseMaybeJson(last?.content ?? null) };
};

export function putScores(repos: Repos, traceId: string, scores: NewScore[]): TraceView {
  if (!repos.traces.get(traceId)) throw notFound('trace', traceId);
  repos.scores.replace(traceId, scores);
  return getTrace(repos, traceId);
}

export function deleteScores(repos: Repos, traceId: string, name: string, source: ScoreSource, turn?: number | null): TraceView & { deleted: number } {
  if (!repos.traces.get(traceId)) throw notFound('trace', traceId);
  const deleted = repos.scores.remove(traceId, name, source, turn);
  return { ...getTrace(repos, traceId), deleted };
}

export const labeledIds = (repos: Repos, runId: string): Set<string> =>
  new Set(repos.scores.listByRun(runId).filter((s) => s.source === 'human').map((s) => s.trace_id));

export function unlabeledIds(repos: Repos, runId: string): string[] {
  const labeled = labeledIds(repos, runId);
  return repos.traces.listByRun(runId).map((t) => t.id).filter((id) => !labeled.has(id));
}

const isObject = (v: Json | undefined): v is JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v);

export function deepMerge(base: JsonObject, patch: JsonObject): JsonObject {
  const out: JsonObject = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const held = out[k];
    out[k] = isObject(held) && isObject(v) ? deepMerge(held, v) : v;
  }
  return out;
}

export function patchMetadata(repos: Repos, traceId: string, patch: { metadata?: JsonObject; events?: TraceEvent[] }): TraceView {
  const trace = repos.traces.get(traceId);
  if (!trace) throw notFound('trace', traceId);
  const merged = patch.metadata ? deepMerge(trace.metadata ?? {}, patch.metadata) : trace.metadata;
  const events = patch.events ? [...(trace.events ?? []), ...patch.events] : trace.events;
  repos.traces.setMetadata(traceId, promote(repos.attributeMaps.list(trace.project_id), merged, events), events);
  return getTrace(repos, traceId);
}

export function listTraces(repos: Repos, q: TraceListQuery): TracePage {
  const { where, params } = toWhere(q.filters, q.run_id);
  const rows = repos.traces.list({ where, params, limit: q.limit + 1, cursor: q.cursor });
  const page = rows.slice(0, q.limit);
  const last = page[page.length - 1];
  return {
    traces: page.map((t) => view(repos, t)),
    next_cursor: rows.length > q.limit && last ? last.id : null,
    url: urls.traces({ filters: q.filters.length ? JSON.stringify(q.filters) : undefined, run_id: q.run_id }),
  };
}
