import { parseJson } from '../db/json.ts';
import type { Repos } from '../db/repos/index.ts';
import type { Json } from '../db/types.ts';
import { invalid } from '../errors.ts';
import type { Filter } from '../services/filters.ts';
import { query } from '../services/query.ts';
import { listTraces, type TraceView } from '../services/traces.ts';
import { urls } from '../urls.ts';
import { later, type ToolResult } from './result.ts';
import type { ListArgs } from './schemas.ts';

type Row = Record<string, unknown>;

const lit = (s: string): string => `'${s.replace(/'/g, "''")}'`;

const parsed = (row: Row, keys: string[]): Row =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, keys.includes(k) && typeof v === 'string' ? parseJson<Json>(v) : v]));

const rows = (repos: Repos, sql: string): Row[] => query(repos.db, sql).rows;

const datasets = (repos: Repos, limit: number): ToolResult => {
  const items = rows(
    repos,
    `SELECT d.*, (SELECT COUNT(*) FROM dataset_item i WHERE i.dataset_id = d.id AND i.archived_at IS NULL) AS item_count FROM dataset d ORDER BY d.created_at DESC LIMIT ${limit}`,
  ).map((r) => ({ ...r, url: urls.datasetItems(String(r.id)) }));
  return { items, url: urls.inbox() };
};

const items = (repos: Repos, datasetId: string | undefined, limit: number): ToolResult => {
  if (!datasetId) throw invalid('dataset_id is required to list items');
  const list = rows(repos, `SELECT * FROM dataset_item WHERE dataset_id = ${lit(datasetId)} AND archived_at IS NULL ORDER BY id LIMIT ${limit}`).map((r) => ({
    ...parsed(r, ['input', 'expected', 'metadata', 'tags']),
    url: urls.datasetItem(datasetId, String(r.id)),
  }));
  return { items: list, url: urls.datasetItems(datasetId) };
};

const runs = (repos: Repos, datasetId: string | undefined, limit: number): ToolResult => {
  const where = datasetId ? ` WHERE dataset_id = ${lit(datasetId)}` : '';
  const list = rows(repos, `SELECT * FROM run${where} ORDER BY started_at DESC LIMIT ${limit}`).map((r) => ({ ...parsed(r, ['metadata']), url: urls.run(String(r.id)) }));
  return { items: list, url: urls.runs(datasetId) };
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
      url: urls.reviewTrace(t.id, t.run_id ?? undefined),
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
    case 'judges':
    case 'disagreements':
      return { items: [], note: later(6) };
    case 'alerts':
    case 'deliveries':
      return { items: [], note: later(9) };
  }
}
