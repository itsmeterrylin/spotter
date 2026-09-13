import type { Repos } from '../db/repos/index.ts';
import type { Run } from '../db/repos/run.ts';
import type { Json } from '../db/types.ts';
import { invalid, notFound } from '../errors.ts';
import { urls } from '../urls.ts';
import { meanByName, runValues, type TraceValues } from './rollup.ts';

export type Cell = { trace_id: string; output: Json | null; scores: Record<string, number>; url: string };

export type CompareItem = {
  item_id: string;
  input: Json;
  expected: Json | null;
  changed: boolean;
  cells: Record<string, Cell | null>;
  url: string;
};

export type Comparison = {
  dataset_id: string;
  runs: Array<Run & { url: string }>;
  items: CompareItem[];
  summary: Record<string, { means: Record<string, number | null>; diff: number | null }>;
  url: string;
};

const cellFor = (repos: Repos, values: TraceValues[], itemId: string): Cell | null => {
  const hit = values.find((v) => v.dataset_item_id === itemId);
  if (!hit) return null;
  const trace = repos.traces.get(hit.trace_id);
  return { trace_id: hit.trace_id, output: trace?.output ?? null, scores: Object.fromEntries(hit.values), url: urls.trace(hit.trace_id) };
};

const differs = (cells: Cell[]): boolean => {
  const names = new Set(cells.flatMap((c) => Object.keys(c.scores)));
  return [...names].some((name) => new Set(cells.map((c) => c.scores[name])).size > 1);
};

export function compare(repos: Repos, datasetId: string, runIds: string[], only?: 'changes'): Comparison {
  const dataset = repos.datasets.get(datasetId);
  if (!dataset) throw notFound('dataset', datasetId);
  if (runIds.length < 2) throw invalid('runs needs at least two run ids');
  const runs = runIds.map((id) => {
    const run = repos.runs.get(id);
    if (!run) throw notFound('run', id);
    if (run.dataset_id !== datasetId) throw invalid(`run ${id} belongs to another dataset`);
    return { ...run, url: urls.run(id) };
  });
  const values = new Map(runIds.map((id) => [id, runValues(repos, id)]));
  const items = repos.datasets
    .listItems(datasetId)
    .map((item) => {
      const cells = Object.fromEntries(runIds.map((id) => [id, cellFor(repos, values.get(id) ?? [], item.id)]));
      const present = Object.values(cells).filter((c): c is Cell => c !== null);
      const changed = present.length < runIds.length ? present.length > 0 : differs(present);
      return { item_id: item.id, input: item.input, expected: item.expected, changed, cells, url: urls.datasetItem(datasetId, item.id) };
    })
    .filter((item) => only !== 'changes' || item.changed);
  const means = new Map(runIds.map((id) => [id, meanByName(values.get(id) ?? [])]));
  const names = [...new Set([...means.values()].flatMap((m) => Object.keys(m)))].sort();
  const first = runIds[0] ?? '';
  const last = runIds[runIds.length - 1] ?? '';
  const summary = Object.fromEntries(
    names.map((name) => {
      const perRun = Object.fromEntries(runIds.map((id) => [id, means.get(id)?.[name]?.mean ?? null]));
      const a = perRun[first];
      const b = perRun[last];
      return [name, { means: perRun, diff: a === null || a === undefined || b === null || b === undefined ? null : b - a }];
    }),
  );
  return { dataset_id: datasetId, runs, items, summary, url: urls.compare(datasetId, runIds, only) };
}
