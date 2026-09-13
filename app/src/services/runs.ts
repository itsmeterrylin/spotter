import type { Repos } from '../db/repos/index.ts';
import type { Run } from '../db/repos/run.ts';
import type { JsonObject } from '../db/types.ts';
import { conflict, notFound } from '../errors.ts';
import { urls } from '../urls.ts';
import { aggregates, type Aggregates } from './aggregates.ts';

export type RunView = Run & { url: string };
export type RunDetail = RunView & { aggregates: Aggregates };
export type RunList = { runs: RunView[]; url: string };

export type RunInput = { id?: string; dataset_id: string; name: string; metadata?: JsonObject | null };

const view = (run: Run): RunView => ({ ...run, url: urls.run(run.id) });

export function createRun(repos: Repos, input: RunInput): { run: RunView; created: boolean } {
  if (!repos.datasets.get(input.dataset_id)) throw notFound('dataset', input.dataset_id);
  const existing = input.id ? repos.runs.get(input.id) : null;
  if (existing) {
    if (existing.dataset_id !== input.dataset_id || existing.name !== input.name) throw conflict(`run ${input.id} already exists with different content`);
    return { run: view(existing), created: false };
  }
  const run = repos.runs.create({ ...input, item_count: repos.datasets.countItems(input.dataset_id) });
  return { run: view(run), created: true };
}

export function getRun(repos: Repos, id: string): RunDetail {
  const run = repos.runs.get(id);
  if (!run) throw notFound('run', id);
  return { ...view(run), aggregates: aggregates(repos, id) };
}

export function listRuns(repos: Repos, datasetId?: string): RunList {
  if (datasetId && !repos.datasets.get(datasetId)) throw notFound('dataset', datasetId);
  return { runs: repos.runs.list(datasetId).map(view), url: urls.runs(datasetId) };
}

export function baselineOf(repos: Repos, run: Run): Run | null {
  const pinned = run.metadata?.baseline;
  const byMeta = typeof pinned === 'string' ? repos.runs.get(pinned) : null;
  if (byMeta) return byMeta;
  const list = repos.runs.list(run.dataset_id);
  const i = list.findIndex((r) => r.id === run.id);
  return i === -1 ? null : (list[i + 1] ?? null);
}
