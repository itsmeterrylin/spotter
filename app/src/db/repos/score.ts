import type { Database } from 'bun:sqlite';
import { uuid7 } from '@spotter/evals/uuid7';
import { nowIso } from '../json.ts';
import type { ScoreSource } from '../types.ts';

export type Score = {
  id: string;
  trace_id: string;
  name: string;
  turn: number | null;
  value: number;
  label: string | null;
  reason: string | null;
  source: ScoreSource;
  judge_version_id: string | null;
  created_at: string;
};

export type NewScore = {
  id?: string;
  name: string;
  value: number;
  turn?: number | null;
  label?: string | null;
  reason?: string | null;
  source: ScoreSource;
  judge_version_id?: string | null;
};

export type RunScore = Score & { dataset_item_id: string | null };

export const scoreRepo = (db: Database) => {
  const insert = db.query<Score, [string, string, string, number | null, number, string | null, string | null, ScoreSource, string | null, string]>(
    'INSERT INTO score (id, trace_id, name, turn, value, label, reason, source, judge_version_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const remove = db.query<Score, [string, string, ScoreSource, number | null]>('DELETE FROM score WHERE trace_id = ? AND name = ? AND source = ? AND turn IS ?');
  const removeAll = db.query<Score, [string, string, ScoreSource]>('DELETE FROM score WHERE trace_id = ? AND name = ? AND source = ?');
  const byTrace = db.query<Score, [string]>('SELECT * FROM score WHERE trace_id = ? ORDER BY name, turn, source');
  const byRun = db.query<RunScore, [string]>(
    'SELECT s.*, t.dataset_item_id FROM score s JOIN trace t ON t.id = s.trace_id WHERE t.run_id = ? ORDER BY s.trace_id, s.name, s.turn',
  );

  const insertOne = (traceId: string, s: NewScore): void => {
    insert.run(s.id ?? uuid7(), traceId, s.name, s.turn ?? null, s.value, s.label ?? null, s.reason ?? null, s.source, s.judge_version_id ?? null, nowIso());
  };

  const replace = db.transaction((traceId: string, list: NewScore[]): void => {
    for (const s of list) {
      remove.run(traceId, s.name, s.source, s.turn ?? null);
      insertOne(traceId, s);
    }
  });

  return {
    insertMany: (traceId: string, list: NewScore[]): void => {
      for (const s of list) insertOne(traceId, s);
    },
    replace: (traceId: string, list: NewScore[]): void => replace(traceId, list),
    remove: (traceId: string, name: string, source: ScoreSource): number => removeAll.run(traceId, name, source).changes,
    listByTrace: (traceId: string): Score[] => byTrace.all(traceId),
    listByRun: (runId: string): RunScore[] => byRun.all(runId),
  };
};

export type ScoreRepo = ReturnType<typeof scoreRepo>;
