import type { Database } from 'bun:sqlite';
import { uuid7 } from '@spotter/evals/uuid7';
import { must, nowIso, parseJson, toJson } from '../json.ts';
import type { JsonObject } from '../types.ts';

type RunRow = {
  id: string;
  dataset_id: string;
  name: string;
  metadata: string | null;
  item_count: number | null;
  items_hash: string | null;
  started_at: string;
  ended_at: string | null;
};

export type Run = Omit<RunRow, 'metadata'> & { metadata: JsonObject | null };

export type NewRun = { id?: string; dataset_id: string; name: string; metadata?: JsonObject | null; item_count?: number | null; items_hash?: string | null };

const parse = (r: RunRow): Run => ({ ...r, metadata: parseJson<JsonObject>(r.metadata) });

export const runRepo = (db: Database) => {
  const byId = db.query<RunRow, [string]>('SELECT * FROM run WHERE id = ?');
  const all = db.query<RunRow, []>('SELECT * FROM run ORDER BY started_at DESC');
  const byDataset = db.query<RunRow, [string]>('SELECT * FROM run WHERE dataset_id = ? ORDER BY started_at DESC');
  const insert = db.query<RunRow, [string, string, string, string | null, number | null, string | null, string]>(
    'INSERT INTO run (id, dataset_id, name, metadata, item_count, items_hash, started_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *',
  );
  const end = db.query<RunRow, [string, string]>('UPDATE run SET ended_at = ? WHERE id = ? RETURNING *');

  return {
    create: (r: NewRun): Run =>
      parse(must(insert.get(r.id ?? uuid7(), r.dataset_id, r.name, toJson(r.metadata), r.item_count ?? null, r.items_hash ?? null, nowIso()), 'run')),
    get: (id: string): Run | null => {
      const row = byId.get(id);
      return row ? parse(row) : null;
    },
    list: (datasetId?: string): Run[] => (datasetId ? byDataset.all(datasetId) : all.all()).map(parse),
    end: (id: string): Run | null => {
      const row = end.get(nowIso(), id);
      return row ? parse(row) : null;
    },
  };
};

export type RunRepo = ReturnType<typeof runRepo>;
