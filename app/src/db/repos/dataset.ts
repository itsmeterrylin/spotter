import type { Database } from 'bun:sqlite';
import { uuid7 } from '@spotter/evals/uuid7';
import { must, nowIso, parseJson, toJson } from '../json.ts';
import type { DatasetPurpose, Json, JsonObject } from '../types.ts';

export type Dataset = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  purpose: DatasetPurpose;
  created_at: string;
};

export type NewDataset = { id?: string; project_id: string; name: string; description?: string | null; purpose?: DatasetPurpose };

type ItemRow = {
  id: string;
  dataset_id: string;
  input: string;
  expected: string | null;
  metadata: string | null;
  tags: string | null;
  source_trace_id: string | null;
  archived_at: string | null;
  created_at: string;
};

export type DatasetItem = Omit<ItemRow, 'input' | 'expected' | 'metadata' | 'tags'> & {
  input: Json;
  expected: Json | null;
  metadata: JsonObject | null;
  tags: string[] | null;
};

export type NewItem = { id: string; input: Json; expected?: Json | null; metadata?: JsonObject | null; tags?: string[] | null; source_trace_id?: string | null };

const parseItem = (r: ItemRow): DatasetItem => ({
  ...r,
  input: parseJson<Json>(r.input) ?? null,
  expected: parseJson<Json>(r.expected),
  metadata: parseJson<JsonObject>(r.metadata),
  tags: parseJson<string[]>(r.tags),
});

export const datasetRepo = (db: Database) => {
  const byId = db.query<Dataset, [string]>('SELECT * FROM dataset WHERE id = ?');
  const byName = db.query<Dataset, [string, string]>('SELECT * FROM dataset WHERE project_id = ? AND name = ?');
  const all = db.query<Dataset, []>('SELECT * FROM dataset ORDER BY created_at DESC');
  const byProject = db.query<Dataset, [string]>('SELECT * FROM dataset WHERE project_id = ? ORDER BY created_at DESC');
  const insert = db.query<Dataset, [string, string, string, string | null, DatasetPurpose, string]>(
    'INSERT INTO dataset (id, project_id, name, description, purpose, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
  );
  const upsertItem = db.query<ItemRow, [string, string, string, string | null, string | null, string | null, string | null, string]>(
    `INSERT INTO dataset_item (id, dataset_id, input, expected, metadata, tags, source_trace_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET input = excluded.input, expected = excluded.expected, metadata = excluded.metadata, tags = excluded.tags`,
  );
  const items = db.query<ItemRow, [string]>('SELECT * FROM dataset_item WHERE dataset_id = ? AND archived_at IS NULL ORDER BY id');
  const itemById = db.query<ItemRow, [string]>('SELECT * FROM dataset_item WHERE id = ?');
  const countItems = db.query<{ n: number }, [string]>('SELECT COUNT(*) AS n FROM dataset_item WHERE dataset_id = ? AND archived_at IS NULL');

  const upsertItems = db.transaction((datasetId: string, list: NewItem[]): number => {
    let n = 0;
    for (const it of list) {
      upsertItem.run(it.id, datasetId, JSON.stringify(it.input), toJson(it.expected), toJson(it.metadata), toJson(it.tags), it.source_trace_id ?? null, nowIso());
      n += 1;
    }
    return n;
  });

  return {
    create: (d: NewDataset): Dataset => must(insert.get(d.id ?? uuid7(), d.project_id, d.name, d.description ?? null, d.purpose ?? 'eval', nowIso()), 'dataset'),
    get: (id: string): Dataset | null => byId.get(id),
    getByName: (projectId: string, name: string): Dataset | null => byName.get(projectId, name),
    list: (projectId?: string): Dataset[] => (projectId ? byProject.all(projectId) : all.all()),
    upsertItems: (datasetId: string, list: NewItem[]): number => upsertItems(datasetId, list),
    listItems: (datasetId: string): DatasetItem[] => items.all(datasetId).map(parseItem),
    getItem: (id: string): DatasetItem | null => {
      const row = itemById.get(id);
      return row ? parseItem(row) : null;
    },
    countItems: (datasetId: string): number => countItems.get(datasetId)?.n ?? 0,
  };
};

export type DatasetRepo = ReturnType<typeof datasetRepo>;
