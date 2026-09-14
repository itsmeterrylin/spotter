import type { Repos } from '../db/repos/index.ts';
import type { Dataset } from '../db/repos/dataset.ts';
import type { Run } from '../db/repos/run.ts';
import type { Score } from '../db/repos/score.ts';
import type { CompareItem } from '../services/compare.ts';
import { disagreementIds } from '../services/disagreements.ts';
import { requireVersion } from '../services/judges.ts';
import { baselineOf } from '../services/runs.ts';
import { regressed, summary, type ScoreSummary } from '../services/summary.ts';
import { unlabeledIds } from '../services/traces.ts';
import type { Verdict } from './ui.tsx';

export type HumanVerdict = { name: string; verdict: Verdict; note: string | null };

export type RunCard = {
  run: Run;
  dataset: Dataset | null;
  baseline: Run | null;
  scores: Record<string, ScoreSummary>;
  primary: string | null;
  unlabeled: number;
  regressed: CompareItem[];
};

export type JudgeQueue = { name: string; version: number; version_id: string };
export type Queue = { run: Run | null; filter: string | undefined; ids: string[]; judge: JudgeQueue | null };
export type QueueQuery = { run?: string; filter?: string; judge?: string; version?: number };

const isVerdict = (s: string | null): s is Verdict => s === 'pass' || s === 'fail' || s === 'defer';

export type JudgeSaid = { version: number; verdict: 'pass' | 'fail'; reason: string | null };

export const judgeSaid = (scores: Score[], judge: JudgeQueue | null): JudgeSaid | null => {
  if (!judge) return null;
  const s = scores.find((x) => x.source === 'judge' && x.judge_version_id === judge.version_id && x.turn === null);
  return s ? { version: judge.version, verdict: s.value >= 0.5 ? 'pass' : 'fail', reason: s.reason } : null;
};

export const humanVerdict = (scores: Score[]): HumanVerdict | null => {
  const s = scores.find((x) => x.source === 'human' && x.turn === null);
  return s && isVerdict(s.label) ? { name: s.name, verdict: s.label, note: s.reason } : null;
};

export const primaryScore = (names: string[], selected?: string): string | null => {
  if (selected && names.includes(selected)) return selected;
  return names.find((n) => n !== 'human') ?? names[0] ?? null;
};

export function runCard(repos: Repos, run: Run, selected?: string): RunCard {
  const baseline = baselineOf(repos, run);
  const scores = summary(repos, run.id, baseline?.id).scores;
  return {
    run,
    dataset: repos.datasets.get(run.dataset_id),
    baseline,
    scores,
    primary: primaryScore(Object.keys(scores), selected),
    unlabeled: unlabeledIds(repos, run.id).length,
    regressed: baseline ? regressed(repos, baseline, run) : [],
  };
}

export function queue(repos: Repos, q: QueueQuery): Queue {
  if (q.judge) {
    const { version } = requireVersion(repos, q.judge, q.version ?? 'active');
    const run = q.run ? repos.runs.get(q.run) : null;
    return { run, filter: undefined, ids: disagreementIds(repos, version.id), judge: { name: q.judge, version: version.number, version_id: version.id } };
  }
  const run = q.run ? repos.runs.get(q.run) : (repos.runs.list()[0] ?? null);
  if (!run) return { run: null, filter: q.filter, ids: [], judge: null };
  const ids = q.filter === 'unlabeled' ? unlabeledIds(repos, run.id) : repos.traces.listByRun(run.id).map((t) => t.id);
  return { run, filter: q.filter, ids, judge: null };
}

export function neighbors(ids: string[], current: string): { next: string | null; prev: string | null } {
  const after = ids.filter((id) => id > current);
  const before = ids.filter((id) => id < current);
  const next = after[0] ?? before[0] ?? null;
  const prev = before[before.length - 1] ?? after[after.length - 1] ?? null;
  return { next: next === current ? null : next, prev: prev === current ? null : prev };
}
