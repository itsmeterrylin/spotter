import type { Repos } from '../db/repos/index.ts';
import { urls } from '../urls.ts';
import { labelTarget, listJudges } from './judges.ts';
import { baselineOf } from './runs.ts';
import { regressed } from './summary.ts';
import { unlabeledIds } from './traces.ts';

export type NotificationKind = 'regression' | 'unlabeled' | 'disagreement' | 'labels' | 'completed';

export type Notification = { kind: NotificationKind; title: string; detail: string; count: number; url: string; action: string };

const dayMs = 24 * 60 * 60 * 1000;

function regressions(repos: Repos): Notification[] {
  const out: Notification[] = [];
  for (const dataset of repos.datasets.list()) {
    const latest = repos.runs.list(dataset.id)[0];
    const baseline = latest ? baselineOf(repos, latest) : null;
    if (!latest || !baseline) continue;
    const count = regressed(repos, baseline, latest).length;
    if (!count) continue;
    const url = urls.compare(latest.dataset_id, [baseline.id, latest.id], 'changes');
    out.push({ kind: 'regression', title: 'regressions', detail: `${latest.name} vs ${baseline.name}`, count, url, action: 'Verify' });
  }
  return out;
}

function unlabeled(repos: Repos): Notification[] {
  return repos.runs
    .list()
    .map((run) => ({ run, count: unlabeledIds(repos, run.id).length }))
    .filter(({ count }) => count > 0)
    .map(({ run, count }) => ({ kind: 'unlabeled' as const, title: 'unlabeled', detail: run.name, count, url: urls.review({ run: run.id, filter: 'unlabeled' }), action: 'Label' }));
}

function judges(repos: Repos): Notification[] {
  const out: Notification[] = [];
  for (const j of listJudges(repos).judges) {
    if (j.disagreements && j.disagreements_url) {
      out.push({ kind: 'disagreement', title: 'disagreements', detail: `${j.name} v${j.active_version}`, count: j.disagreements, url: j.disagreements_url, action: 'Resolve' });
    }
    if (j.labels < labelTarget) {
      out.push({ kind: 'labels', title: 'labels needed', detail: j.name, count: labelTarget - j.labels, url: urls.review({ filter: 'unlabeled' }), action: 'Label' });
    }
  }
  return out;
}

function completed(repos: Repos, now: number): Notification[] {
  return repos.runs
    .list()
    .filter((run) => run.ended_at !== null && now - Date.parse(run.ended_at) < dayMs)
    .map((run) => ({ kind: 'completed' as const, title: 'traces done', detail: run.name, count: repos.traces.listByRun(run.id).length, url: urls.run(run.id), action: 'Open' }));
}

export const notifications = (repos: Repos, now: number = Date.now()): Notification[] => [...regressions(repos), ...unlabeled(repos), ...judges(repos), ...completed(repos, now)];

export const unreadCount = (repos: Repos): number => notifications(repos).length;
