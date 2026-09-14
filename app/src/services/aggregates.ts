import type { Repos } from '../db/repos/index.ts';
import type { Trace } from '../db/repos/trace.ts';
import { counts, meanByName, runValues } from './rollup.ts';

export type Aggregates = {
  trace_count: number;
  scores: Record<string, { mean: number; n: number }>;
  pending: string[];
  p50_duration_ms: number | null;
  tokens: { prompt: number; completion: number; total: number };
};

const durationOf = (t: Trace): number | null => {
  const ms = t.metrics?.duration_ms;
  if (typeof ms === 'number') return ms;
  return t.end ? Date.parse(t.end) - Date.parse(t.start) : null;
};

const p50 = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] ?? null) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

export function aggregates(repos: Repos, runId: string): Aggregates {
  const traces = repos.traces.listByRun(runId);
  const scores = repos.scores.listByRun(runId);
  const kept = new Set(counts(repos, scores).map((s) => s.id));
  const prompt = traces.reduce((a, t) => a + num(t.metrics?.prompt_tokens), 0);
  const completion = traces.reduce((a, t) => a + num(t.metrics?.completion_tokens), 0);
  return {
    trace_count: traces.length,
    scores: meanByName(runValues(repos, runId, scores)),
    pending: [...new Set(scores.filter((s) => s.source === 'judge' && !kept.has(s.id)).map((s) => s.name))].sort(),
    p50_duration_ms: p50(traces.map(durationOf).filter((d): d is number => d !== null)),
    tokens: { prompt, completion, total: prompt + completion },
  };
}
