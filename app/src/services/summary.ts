import type { Repos } from '../db/repos/index.ts';
import type { Run } from '../db/repos/run.ts';
import { notFound } from '../errors.ts';
import { urls } from '../urls.ts';
import { compare, type CompareItem } from './compare.ts';
import { itemValues, meanByName, runValues } from './rollup.ts';

export type ScoreSummary = {
  mean: number;
  n: number;
  baseline_mean: number | null;
  diff: number | null;
  improvements: number;
  regressions: number;
};

export type Summary = { run_id: string; compare_to: string | null; scores: Record<string, ScoreSummary>; url: string };

export function summary(repos: Repos, runId: string, compareTo?: string): Summary {
  const run = repos.runs.get(runId);
  if (!run) throw notFound('run', runId);
  const current = runValues(repos, runId);
  const means = meanByName(current);
  if (!compareTo) {
    const scores = Object.fromEntries(
      Object.entries(means).map(([name, m]) => [name, { ...m, baseline_mean: null, diff: null, improvements: 0, regressions: 0 }]),
    );
    return { run_id: runId, compare_to: null, scores, url: urls.run(runId) };
  }
  const baseline = repos.runs.get(compareTo);
  if (!baseline) throw notFound('run', compareTo);
  const baseMeans = meanByName(runValues(repos, compareTo));
  const now = itemValues(current);
  const before = itemValues(runValues(repos, compareTo));
  const scores: Record<string, ScoreSummary> = {};
  for (const [name, m] of Object.entries(means)) {
    let improvements = 0;
    let regressions = 0;
    for (const [item, values] of now) {
      const a = before.get(item)?.get(name);
      const b = values.get(name);
      if (a === undefined || b === undefined) continue;
      if (b > a) improvements += 1;
      if (b < a) regressions += 1;
    }
    const base = baseMeans[name]?.mean ?? null;
    scores[name] = { ...m, baseline_mean: base, diff: base === null ? null : m.mean - base, improvements, regressions };
  }
  return { run_id: runId, compare_to: compareTo, scores, url: urls.compare(run.dataset_id, [compareTo, runId], 'changes') };
}

const worse = (item: CompareItem, baseId: string, runId: string): boolean => {
  const a = item.cells[baseId];
  const b = item.cells[runId];
  if (!a || !b) return false;
  return Object.keys(a.scores).some((name) => (b.scores[name] ?? 0) < (a.scores[name] ?? 0));
};

export const regressed = (repos: Repos, baseline: Run, run: Run): CompareItem[] =>
  compare(repos, run.dataset_id, [baseline.id, run.id], 'changes').items.filter((item) => worse(item, baseline.id, run.id));
