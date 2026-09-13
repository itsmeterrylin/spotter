import type { Dataset, NewItem } from '../db/repos/dataset.ts';
import type { Repos } from '../db/repos/index.ts';
import type { DatasetPurpose } from '../db/types.ts';
import { conflict, notFound } from '../errors.ts';
import { urls } from '../urls.ts';

export type DatasetView = Dataset & { item_count: number; url: string };

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
