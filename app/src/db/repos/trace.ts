import type { Database, SQLQueryBindings } from 'bun:sqlite';
import { nowIso, parseJson, toJson } from '../json.ts';
import type { Json, JsonObject, Message, Metrics, TraceEvent } from '../types.ts';

type TraceRow = {
  id: string;
  project_id: string;
  run_id: string | null;
  dataset_item_id: string | null;
  input: string | null;
  output: string | null;
  expected: string | null;
  metadata: string | null;
  tags: string | null;
  start: string;
  end: string | null;
  metrics: string | null;
  messages: string | null;
  events: string | null;
  spans: string | null;
  created_at: string;
};

type JsonColumns = 'input' | 'output' | 'expected' | 'metadata' | 'tags' | 'metrics' | 'messages' | 'events' | 'spans';

export type Trace = Omit<TraceRow, JsonColumns> & {
  input: Json | null;
  output: Json | null;
  expected: Json | null;
  metadata: JsonObject | null;
  tags: string[] | null;
  metrics: Metrics | null;
  messages: Message[] | null;
  events: TraceEvent[] | null;
  spans: Json | null;
};

export type NewTrace = Omit<Partial<Trace>, 'id' | 'project_id' | 'start' | 'created_at'> & { id: string; project_id: string; start: string };

export type TraceQuery = { where: string; params: SQLQueryBindings[]; limit: number; cursor?: string | null };

const parse = (r: TraceRow): Trace => ({
  ...r,
  input: parseJson<Json>(r.input),
  output: parseJson<Json>(r.output),
  expected: parseJson<Json>(r.expected),
  metadata: parseJson<JsonObject>(r.metadata),
  tags: parseJson<string[]>(r.tags),
  metrics: parseJson<Metrics>(r.metrics),
  messages: parseJson<Message[]>(r.messages),
  events: parseJson<TraceEvent[]>(r.events),
  spans: parseJson<Json>(r.spans),
});

const columns = 'id, project_id, run_id, dataset_item_id, input, output, expected, metadata, tags, start, "end", metrics, messages, events, spans, created_at';

export const traceRepo = (db: Database) => {
  const byId = db.query<TraceRow, [string]>('SELECT * FROM trace WHERE id = ?');
  const byRun = db.query<TraceRow, [string]>('SELECT * FROM trace WHERE run_id = ? ORDER BY id');
  const insert = db.prepare<TraceRow, SQLQueryBindings[]>(`INSERT OR IGNORE INTO trace (${columns}) VALUES (${columns.split(', ').map(() => '?').join(', ')})`);
  const update = db.query<TraceRow, [string | null, string | null, string]>('UPDATE trace SET metadata = ?, events = ? WHERE id = ? RETURNING *');

  return {
    insert: (t: NewTrace): boolean =>
      insert.run(
        t.id,
        t.project_id,
        t.run_id ?? null,
        t.dataset_item_id ?? null,
        toJson(t.input),
        toJson(t.output),
        toJson(t.expected),
        toJson(t.metadata),
        toJson(t.tags),
        t.start,
        t.end ?? null,
        toJson(t.metrics),
        toJson(t.messages),
        toJson(t.events),
        toJson(t.spans),
        nowIso(),
      ).changes > 0,
    get: (id: string): Trace | null => {
      const row = byId.get(id);
      return row ? parse(row) : null;
    },
    listByRun: (runId: string): Trace[] => byRun.all(runId).map(parse),
    list: (q: TraceQuery): Trace[] => {
      const cursor = q.cursor ? ' AND id < ?' : '';
      const params: SQLQueryBindings[] = q.cursor ? [...q.params, q.cursor, q.limit] : [...q.params, q.limit];
      return db.query<TraceRow, SQLQueryBindings[]>(`SELECT * FROM trace WHERE ${q.where}${cursor} ORDER BY id DESC LIMIT ?`).all(...params).map(parse);
    },
    setMetadata: (id: string, metadata: JsonObject | null, events: TraceEvent[] | null): Trace | null => {
      const row = update.get(toJson(metadata), toJson(events), id);
      return row ? parse(row) : null;
    },
  };
};

export type TraceRepo = ReturnType<typeof traceRepo>;
