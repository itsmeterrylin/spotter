import type { Repos } from '../db/repos/index.ts';
import { invalid } from '../errors.ts';
import type { Filter } from '../services/filters.ts';
import { listItems } from '../services/datasets.ts';
import { disagreements } from '../services/disagreements.ts';
import { listJudges } from '../services/judges.ts';
import { query } from '../services/query.ts';
import { listRuns } from '../services/runs.ts';
import { listTraces, type TraceView } from '../services/traces.ts';
import { urls } from '../urls.ts';
import { later, type ToolResult } from './result.ts';
import type { ListArgs } from './schemas.ts';

type Row = Record<string, unknown>;

const rows = (repos: Repos, sql: string): Row[] => query(repos.db, sql).rows;

const datasets = (repos: Repos, limit: number): ToolResult => {
  const items = rows(
    repos,
    `SELECT d.*, (SELECT COUNT(*) FROM dataset_item i WHERE i.dataset_id = d.id AND i.archived_at IS NULL) AS item_count FROM dataset d ORDER BY d.created_at DESC LIMIT ${limit}`,
  ).map((r) => ({ ...r, url: urls.datasetItems(String(r.id)) }));
  return { items, url: urls.datasets() };
};

const items = (repos: Repos, datasetId: string | undefined, limit: number): ToolResult => {
  if (!datasetId) throw invalid('dataset_id is required to list items');
  const list = listItems(repos, datasetId);
  return { items: list.items.slice(0, limit), url: list.url };
};

const runs = (repos: Repos, datasetId: string | undefined, limit: number): ToolResult => {
  const list = listRuns(repos, datasetId);
  return { items: list.runs.slice(0, limit), url: list.url };
};

const traces = (repos: Repos, args: ListArgs, filters: Filter[]): ToolResult => {
  const page = listTraces(repos, { filters, run_id: args.run_id, limit: args.limit });
  return { items: page.traces, next_cursor: page.next_cursor, url: page.url };
};

const noteOf = (t: TraceView) =>
  t.scores
    .filter((s) => s.source === 'human' && s.reason)
    .map((s) => ({
      ...s,
      trace: { id: t.id, run_id: t.run_id, dataset_item_id: t.dataset_item_id, input: t.input, output: t.output, expected: t.expected, url: t.url },
      url: urls.reviewTrace(t.id, { run: t.run_id }),
    }));

const notes = (repos: Repos, args: ListArgs): ToolResult => {
  const filters: Filter[] = [{ field: 'source', operator: '=', value: 'human' }, ...(args.filters ?? [])];
  const page = listTraces(repos, { filters, run_id: args.run_id, limit: args.limit });
  return { items: page.traces.flatMap(noteOf), next_cursor: page.next_cursor, url: page.url };
};

export function list(repos: Repos, args: ListArgs): ToolResult {
  switch (args.type) {
    case 'datasets':
      return datasets(repos, args.limit);
    case 'items':
      return items(repos, args.dataset_id, args.limit);
    case 'runs':
      return runs(repos, args.dataset_id, args.limit);
    case 'traces':
      return traces(repos, args, args.filters ?? []);
    case 'notes':
      return notes(repos, args);
    case 'judges': {
      const list = listJudges(repos);
      return { items: list.judges.slice(0, args.limit), url: list.url };
    }
    case 'disagreements': {
      if (!args.judge) throw invalid('judge is required to list disagreements');
      const list = disagreements(repos, args.judge, args.version ?? 'active');
      return { items: list.traces.slice(0, args.limit), judge: list.judge, version: list.version, url: list.url };
    }
    case 'alerts':
    case 'deliveries':
      return { items: [], note: later(9) };
  }
}
