import { createClient, type ApiClient, type ClientConfig } from './client.ts';
import { executeAll, localSummary, type ItemResult } from './execute.ts';
import type { EvalDefinition, EvalItem, JsonObject } from './index.ts';
import { gitSha } from './load.ts';
import type { SummaryLinks, SummaryView } from './summary.ts';
import { uuid7 } from './uuid7.ts';

export type RunOptions = { base: string; name?: string; send: boolean; create: boolean; baseline?: string; client: ClientConfig; env?: Record<string, string | undefined> };
export type RunReport = SummaryLinks & { run_id: string | null; dataset_id: string | null; summary: SummaryView; results: ItemResult[] };

export const batchSize = 50;
const itemsPerPut = 1000;

type Row = Record<string, unknown>;
type WithId = { id: string; url?: string };

const quote = (s: string): string => `'${s.replace(/'/g, "''")}'`;

const rows = async (client: ApiClient, sql: string): Promise<Row[]> => ((await client.post('/api/query', { sql })) as { rows: Row[] }).rows;

const str = (row: Row | undefined, key: string): string | null => (typeof row?.[key] === 'string' ? (row[key] as string) : null);

async function findDataset(client: ApiClient, project: string, name: string): Promise<string | null> {
  const found = await rows(client, `SELECT d.id FROM dataset d JOIN project p ON p.id = d.project_id WHERE p.name = ${quote(project)} AND d.name = ${quote(name)}`);
  return str(found[0], 'id');
}

async function fetchItems(client: ApiClient, datasetId: string): Promise<EvalItem[]> {
  const list = (await client.get(`/api/datasets/${datasetId}/items`)) as { items: EvalItem[] };
  return list.items.map((r) => ({ id: r.id, input: r.input, expected: r.expected, metadata: r.metadata }));
}

const listRuns = async (client: ApiClient, datasetId: string): Promise<WithId[]> => ((await client.get(`/api/runs?dataset_id=${encodeURIComponent(datasetId)}`)) as { runs: WithId[] }).runs;

export function variantOf(def: EvalDefinition, env: Record<string, string | undefined>): string | null {
  const names = Array.isArray(def.metadata.variant_env) ? def.metadata.variant_env.filter((n): n is string => typeof n === 'string') : [];
  const values = names.map((n) => env[n]).filter((v): v is string => typeof v === 'string' && v !== '');
  return values.length ? values.join(' ') : null;
}

export const runName = (base: string, count: number, variant: string | null): string => `${base} #${count + 1}${variant ? ` (${variant})` : ''}`;

async function resolveDataset(client: ApiClient, def: EvalDefinition, fileItems: EvalItem[] | null, create: boolean): Promise<{ id: string; items: EvalItem[] }> {
  let id = await findDataset(client, def.project, def.dataset);
  if (!id && !create) throw new Error(`dataset ${def.dataset} not found in project ${def.project}; run with --create to create it`);
  if (!id) id = ((await client.post('/api/datasets', { project: def.project, name: def.dataset })) as WithId).id;
  if (create && fileItems) {
    for (let i = 0; i < fileItems.length; i += itemsPerPut) await client.put(`/api/datasets/${id}/items`, { items: fileItems.slice(i, i + itemsPerPut) });
  }
  const items = fileItems ?? (await fetchItems(client, id));
  if (items.length === 0) throw new Error(`dataset ${def.dataset} has no items; export items from the eval file and run with --create`);
  return { id, items };
}

const toTrace = (def: EvalDefinition, runId: string, r: ItemResult) => ({
  id: uuid7(),
  project: def.project,
  run_id: runId,
  dataset_item_id: r.item.id,
  input: r.item.input,
  output: r.output,
  expected: r.item.expected,
  start: r.start,
  end: r.end,
  metrics: { duration_ms: r.duration_ms },
  scores: r.scores.map((s) => ({ name: s.name, value: s.value, label: s.label ?? null, reason: s.reason ?? null, source: 'sdk' })),
});

async function postResults(client: ApiClient, def: EvalDefinition, runId: string, items: EvalItem[]): Promise<ItemResult[]> {
  let pending: ItemResult[] = [];
  const flush = async (): Promise<void> => {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    await client.post('/api/traces/batch', { traces: batch.map((r) => toTrace(def, runId, r)) });
  };
  const results = await executeAll(def, items, async (r) => {
    pending.push(r);
    if (pending.length >= batchSize) await flush();
  });
  await flush();
  return results;
}

async function summarize(client: ApiClient, runId: string, compareTo: string | null): Promise<Pick<RunReport, 'summary' | 'compare_url' | 'compare_note'>> {
  if (!compareTo) {
    const summary = (await client.get(`/api/runs/${runId}/summary`)) as SummaryView;
    return { summary, compare_url: null, compare_note: 'no previous run on this dataset; nothing to compare' };
  }
  const summary = (await client.get(`/api/runs/${runId}/summary?compare_to=${encodeURIComponent(compareTo)}`)) as SummaryView;
  return { summary, compare_url: summary.url, compare_note: null };
}

async function runLocal(def: EvalDefinition, fileItems: EvalItem[] | null): Promise<RunReport> {
  if (!fileItems) throw new Error('--no-send needs the eval file to export items');
  const results = await executeAll(def, fileItems);
  const summary = localSummary(results);
  return { run_id: null, dataset_id: null, summary, results, run_url: null, compare_url: null, compare_note: 'not sent; nothing to compare' };
}

export async function runEval(def: EvalDefinition, fileItems: EvalItem[] | null, options: RunOptions): Promise<RunReport> {
  if (!options.send) return runLocal(def, fileItems);
  const client = createClient(options.client);
  const dataset = await resolveDataset(client, def, fileItems, options.create);
  const earlier = await listRuns(client, dataset.id);
  const variant = variantOf(def, options.env ?? process.env);
  const sha = gitSha();
  const metadata: JsonObject = { ...def.metadata, ...(sha ? { git_sha: sha } : {}), ...(variant ? { variant } : {}) };
  const name = options.name ?? runName(options.base, earlier.length, variant);
  const run = (await client.post('/api/runs', { dataset_id: dataset.id, name, metadata })) as WithId;
  const results = await postResults(client, def, run.id, dataset.items);
  const compareTo = options.baseline ?? earlier[0]?.id ?? null;
  await client.patch(`/api/runs/${run.id}`, compareTo ? { metadata: { baseline: compareTo } } : {});
  const rest = await summarize(client, run.id, compareTo);
  return { run_id: run.id, dataset_id: dataset.id, results, run_url: run.url ?? null, ...rest };
}

export async function compareRuns(config: ClientConfig, baseline: string, current: string): Promise<SummaryView> {
  const client = createClient(config);
  return (await client.get(`/api/runs/${current}/summary?compare_to=${encodeURIComponent(baseline)}`)) as SummaryView;
}
