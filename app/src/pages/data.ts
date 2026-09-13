import type { Repos } from '../db/repos/index.ts';
import type { Run } from '../db/repos/run.ts';
import type { Score } from '../db/repos/score.ts';
import type { CompareItem } from '../services/compare.ts';
import { baselineOf } from '../services/runs.ts';
import { regressed, summary, type ScoreSummary } from '../services/summary.ts';
import { unlabeledIds } from '../services/traces.ts';
import { urls } from '../urls.ts';
import type { Verdict } from './ui.tsx';

export type HumanVerdict = { name: string; verdict: Verdict; note: string | null };

export type RunCard = {
  run: Run;
  baseline: Run | null;
  scores: Record<string, ScoreSummary>;
  primary: string | null;
  unlabeled: number;
  regressed: CompareItem[];
};

export type InboxItem = { icon: 'down' | 'human'; count: number; label: string; href: string; cta: string };

export type Queue = { run: Run | null; filter: string | undefined; ids: string[] };

const isVerdict = (s: string | null): s is Verdict => s === 'pass' || s === 'fail' || s === 'defer';

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
    baseline,
    scores,
    primary: primaryScore(Object.keys(scores), selected),
    unlabeled: unlabeledIds(repos, run.id).length,
    regressed: baseline ? regressed(repos, baseline, run) : [],
  };
}

export function inboxItems(repos: Repos): InboxItem[] {
  const runs = repos.runs.list();
  const items: InboxItem[] = [];
  const latest = runs[0];
  if (latest) {
    const card = runCard(repos, latest);
    if (card.baseline && card.regressed.length) {
      const href = urls.compare(latest.dataset_id, [card.baseline.id, latest.id], 'changes');
      items.push({ icon: 'down', count: card.regressed.length, label: `regressions · ${latest.name} vs ${card.baseline.name}`, href, cta: 'Verify' });
    }
  }
  for (const run of runs) {
    const n = unlabeledIds(repos, run.id).length;
    if (n) items.push({ icon: 'human', count: n, label: `unlabeled · ${run.name}`, href: urls.review(run.id, 'unlabeled'), cta: 'Label' });
  }
  return items;
}

export function queue(repos: Repos, runId?: string, filter?: string): Queue {
  const run = runId ? repos.runs.get(runId) : (repos.runs.list()[0] ?? null);
  if (!run) return { run: null, filter, ids: [] };
  const ids = filter === 'unlabeled' ? unlabeledIds(repos, run.id) : repos.traces.listByRun(run.id).map((t) => t.id);
  return { run, filter, ids };
}

export function neighbors(ids: string[], current: string): { next: string | null; prev: string | null } {
  const after = ids.filter((id) => id > current);
  const before = ids.filter((id) => id < current);
  const next = after[0] ?? before[0] ?? null;
  const prev = before[before.length - 1] ?? after[after.length - 1] ?? null;
  return { next: next === current ? null : next, prev: prev === current ? null : prev };
}
