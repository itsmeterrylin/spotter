import type { Dataset, DatasetItem, NewItem } from '../db/repos/dataset.ts';
import type { Repos } from '../db/repos/index.ts';
import type { Trace } from '../db/repos/trace.ts';
import type { DatasetPurpose } from '../db/types.ts';
import { uuid7 } from '@spotter/evals/uuid7';
import { conflict, invalid, notFound } from '../errors.ts';
import { urls } from '../urls.ts';

export type DatasetView = Dataset & { item_count: number; url: string };
export type ItemView = DatasetItem & { url: string };
export type ItemList = { items: ItemView[]; url: string };

export type DatasetInput = { id?: string; project: string; name: string; description?: string | null; purpose?: DatasetPurpose };

export const datasetView = (repos: Repos, d: Dataset): DatasetView => ({ ...d, item_count: repos.datasets.countItems(d.id), url: urls.datasetItems(d.id) });

export function createDataset(repos: Repos, input: DatasetInput): { dataset: DatasetView; created: boolean } {
  const project = repos.projects.ensure(input.project);
  const byName = repos.datasets.getByName(project.id, input.name);
  if (byName) {
    if (input.id && input.id !== byName.id) throw conflict(`dataset ${input.name} already exists with id ${byName.id}`);
    return { dataset: datasetView(repos, byName), created: false };
  }
  const byId = input.id ? repos.datasets.get(input.id) : null;
  if (byId) throw conflict(`dataset id ${input.id} already belongs to ${byId.name}`);
  const dataset = repos.datasets.create({ id: input.id, project_id: project.id, name: input.name, description: input.description, purpose: input.purpose });
  return { dataset: datasetView(repos, dataset), created: true };
}

export function getDataset(repos: Repos, id: string): DatasetView {
  const dataset = repos.datasets.get(id);
  if (!dataset) throw notFound('dataset', id);
  return datasetView(repos, dataset);
}

export function upsertItems(repos: Repos, datasetId: string, items: NewItem[]): { upserted: number; url: string } {
  getDataset(repos, datasetId);
  return { upserted: repos.datasets.upsertItems(datasetId, items), url: urls.datasetItems(datasetId) };
}

export function listItems(repos: Repos, datasetId: string): ItemList {
  getDataset(repos, datasetId);
  const items = repos.datasets.listItems(datasetId).map((item) => ({ ...item, url: urls.datasetItem(datasetId, item.id) }));
  return { items, url: urls.datasetItems(datasetId) };
}

export type FromTracesInput = {
  dataset_id?: string;
  dataset_name?: string;
  project?: string;
  trace_ids?: string[];
  issue_id?: string;
  tags?: string[];
};

export type FromTracesResult = { ids: string[]; added: number; url: string };

function resolveTarget(repos: Repos, input: FromTracesInput): string {
  if (input.dataset_id) return getDataset(repos, input.dataset_id).id;
  if (input.dataset_name && input.project) return createDataset(repos, { project: input.project, name: input.dataset_name }).dataset.id;
  throw invalid('pass dataset_id, or dataset_name with project');
}

function sourceTraceIds(repos: Repos, input: FromTracesInput): string[] {
  const issueTraces = input.issue_id ? occurrenceTraces(repos, input.issue_id) : [];
  const ids = [...new Set([...(input.trace_ids ?? []), ...issueTraces])];
  if (!ids.length) throw invalid('pass trace_ids or an issue_id with at least one occurrence');
  return ids;
}

function occurrenceTraces(repos: Repos, issueId: string): string[] {
  if (!repos.issues.get(issueId)) throw notFound('issue', issueId);
  return repos.issues.occurrences(issueId).map((o) => o.trace_id);
}

function requireTrace(repos: Repos, id: string): Trace {
  const trace = repos.traces.get(id);
  if (!trace) throw notFound('trace', id);
  return trace;
}

/** Copies input and expected from each trace into a dataset item. Idempotent on (dataset_id, source_trace_id). */
export function itemsFromTraces(repos: Repos, input: FromTracesInput): FromTracesResult {
  const traceIds = sourceTraceIds(repos, input);
  const traces = traceIds.map((id) => requireTrace(repos, id));
  return repos.tx(() => {
    const datasetId = resolveTarget(repos, input);
    const existing = repos.datasets.itemsBySourceTrace(datasetId);
    const fresh = traces
      .filter((t) => !existing.has(t.id))
      .map((t) => ({ id: uuid7(), input: t.input ?? null, expected: t.expected, tags: input.tags ?? null, source_trace_id: t.id }));
    repos.datasets.upsertItems(datasetId, fresh);
    const ids = traces.map((t) => existing.get(t.id) ?? fresh.find((f) => f.source_trace_id === t.id)?.id ?? '');
    return { ids, added: fresh.length, url: urls.datasetItems(datasetId) };
  });
}
