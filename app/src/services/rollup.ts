import type { Repos } from '../db/repos/index.ts';
import type { RunScore, Score } from '../db/repos/score.ts';
import type { ScoreSource } from '../db/types.ts';
import { calibrationBar } from './judges.ts';

const priority: Record<ScoreSource, number> = { human: 0, sdk: 1, judge: 2 };

export type TraceValues = { trace_id: string; dataset_item_id: string | null; values: Map<string, number> };

export const counts = (repos: Repos, scores: Score[]): Score[] => {
  const calibrated = repos.judges.calibratedVersionIds(calibrationBar);
  return scores.filter((s) => s.label !== 'defer' && (s.source !== 'judge' || (s.judge_version_id !== null && calibrated.has(s.judge_version_id))));
};

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

export function rollup(scores: Score[]): Map<string, number> {
  const byName = new Map<string, Map<number | null, Score>>();
  for (const s of scores) {
    const turns = byName.get(s.name) ?? new Map<number | null, Score>();
    const held = turns.get(s.turn);
    if (!held || priority[s.source] < priority[held.source]) turns.set(s.turn, s);
    byName.set(s.name, turns);
  }
  const out = new Map<string, number>();
  for (const [name, turns] of byName) {
    const whole = turns.get(null);
    out.set(name, whole ? whole.value : mean([...turns.values()].map((s) => s.value)));
  }
  return out;
}

export function runValues(repos: Repos, runId: string, scores: RunScore[] = repos.scores.listByRun(runId)): TraceValues[] {
  const byTrace = new Map<string, RunScore[]>();
  for (const s of counts(repos, scores) as RunScore[]) {
    byTrace.set(s.trace_id, [...(byTrace.get(s.trace_id) ?? []), s]);
  }
  return [...byTrace.entries()].map(([trace_id, list]) => ({ trace_id, dataset_item_id: list[0]?.dataset_item_id ?? null, values: rollup(list) }));
}

export function itemValues(traces: TraceValues[]): Map<string, Map<string, number>> {
  const acc = new Map<string, Map<string, number[]>>();
  for (const t of traces) {
    if (t.dataset_item_id === null) continue;
    const names = acc.get(t.dataset_item_id) ?? new Map<string, number[]>();
    for (const [name, v] of t.values) names.set(name, [...(names.get(name) ?? []), v]);
    acc.set(t.dataset_item_id, names);
  }
  return new Map([...acc].map(([item, names]) => [item, new Map([...names].map(([n, xs]) => [n, mean(xs)]))]));
}

export const meanByName = (traces: TraceValues[]): Record<string, { mean: number; n: number }> => {
  const acc = new Map<string, number[]>();
  for (const t of traces) for (const [name, v] of t.values) acc.set(name, [...(acc.get(name) ?? []), v]);
  return Object.fromEntries([...acc].sort(([a], [b]) => a.localeCompare(b)).map(([name, xs]) => [name, { mean: mean(xs), n: xs.length }]));
};
