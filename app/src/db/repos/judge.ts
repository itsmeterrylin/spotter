import type { Database } from 'bun:sqlite';
import { uuid7 } from '@spotter/evals/uuid7';
import { must, nowIso, parseJson, toJson } from '../json.ts';
import type { CreatedBy, Json, JsonObject, JudgeScope, Split } from '../types.ts';

export type Judge = { name: string; active_version_id: string | null; description: string | null; created_at: string };

type VersionRow = {
  id: string;
  judge_name: string;
  number: number;
  parent_id: string | null;
  scope: JudgeScope;
  prompt: string;
  model: string;
  params: string | null;
  examples: string | null;
  content_hash: string;
  created_by: CreatedBy;
  note: string | null;
  created_at: string;
};

export type JudgeVersion = Omit<VersionRow, 'params' | 'examples'> & { params: JsonObject | null; examples: Json | null };

export type NewJudgeVersion = {
  id?: string;
  judge_name: string;
  number: number;
  parent_id?: string | null;
  scope?: JudgeScope;
  prompt: string;
  model: string;
  params?: JsonObject | null;
  examples?: Json | null;
  content_hash: string;
  created_by: CreatedBy;
  note?: string | null;
};

export type Calibration = { judge_version_id: string; dataset_id: string | null; split: Split; n: number; tpr: number; tnr: number; created_at: string };

export type LabelPair = { trace_id: string; name: string; turn: number | null; human: number; judge: number; human_note: string | null; judge_reason: string | null };

const pairsSql = `SELECT j.trace_id, j.name, j.turn, h.value AS human, j.value AS judge, h.reason AS human_note, j.reason AS judge_reason
   FROM score j JOIN score h ON h.trace_id = j.trace_id AND h.name = j.name AND h.source = 'human' AND h.turn IS j.turn
   WHERE j.source = 'judge' AND j.judge_version_id = ? AND (h.label IS NULL OR h.label != 'defer') ORDER BY j.trace_id`;

const parse = (r: VersionRow): JudgeVersion => ({ ...r, params: parseJson<JsonObject>(r.params), examples: parseJson<Json>(r.examples) });

export const judgeRepo = (db: Database) => {
  const byName = db.query<Judge, [string]>('SELECT * FROM judge WHERE name = ?');
  const all = db.query<Judge, []>('SELECT * FROM judge ORDER BY name');
  const insert = db.query<Judge, [string, string | null, string]>('INSERT INTO judge (name, description, created_at) VALUES (?, ?, ?) RETURNING *');
  const versions = db.query<VersionRow, [string]>('SELECT * FROM judge_version WHERE judge_name = ? ORDER BY number');
  const versionById = db.query<VersionRow, [string]>('SELECT * FROM judge_version WHERE id = ?');
  const versionByNumber = db.query<VersionRow, [string, number]>('SELECT * FROM judge_version WHERE judge_name = ? AND number = ?');
  const versionByHash = db.query<VersionRow, [string, string]>('SELECT * FROM judge_version WHERE judge_name = ? AND content_hash = ?');
  const setNote = db.query<VersionRow, [string | null, string]>('UPDATE judge_version SET note = ? WHERE id = ? RETURNING *');
  const pairs = db.query<LabelPair, [string]>(pairsSql);
  const labels = db.query<{ n: number }, [string]>("SELECT COUNT(*) AS n FROM score WHERE source = 'human' AND name = ? AND (label IS NULL OR label != 'defer')");
  const judged = db.query<{ n: number }, [string]>("SELECT COUNT(*) AS n FROM score WHERE source = 'judge' AND judge_version_id = ?");
  const insertVersion = db.query<VersionRow, [string, string, number, string | null, JudgeScope, string, string, string | null, string | null, string, CreatedBy, string | null, string]>(
    `INSERT INTO judge_version (id, judge_name, number, parent_id, scope, prompt, model, params, examples, content_hash, created_by, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
  );
  const activate = db.query<Judge, [string, string]>('UPDATE judge SET active_version_id = ? WHERE name = ? RETURNING *');
  const calibrations = db.query<Calibration, [string]>('SELECT * FROM judge_calibration WHERE judge_version_id = ? ORDER BY split');
  const insertCalibration = db.query<Calibration, [string, string | null, Split, number, number, number, string]>(
    `INSERT INTO judge_calibration (judge_version_id, dataset_id, split, n, tpr, tnr, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(judge_version_id, split) DO UPDATE SET dataset_id = excluded.dataset_id, n = excluded.n, tpr = excluded.tpr, tnr = excluded.tnr, created_at = excluded.created_at
     RETURNING *`,
  );
  const calibrated = db.query<{ judge_version_id: string }, []>("SELECT judge_version_id FROM judge_calibration WHERE split = 'test'");

  return {
    get: (name: string): Judge | null => byName.get(name),
    list: (): Judge[] => all.all(),
    ensure: (name: string, description?: string | null): Judge => byName.get(name) ?? must(insert.get(name, description ?? null, nowIso()), 'judge'),
    versions: (name: string): JudgeVersion[] => versions.all(name).map(parse),
    getVersion: (id: string): JudgeVersion | null => {
      const row = versionById.get(id);
      return row ? parse(row) : null;
    },
    getVersionByNumber: (name: string, number: number): JudgeVersion | null => {
      const row = versionByNumber.get(name, number);
      return row ? parse(row) : null;
    },
    getVersionByHash: (name: string, hash: string): JudgeVersion | null => {
      const row = versionByHash.get(name, hash);
      return row ? parse(row) : null;
    },
    setNote: (id: string, note: string | null): JudgeVersion => parse(must(setNote.get(note, id), 'judge_version')),
    pairs: (versionId: string): LabelPair[] => pairs.all(versionId),
    labelCount: (name: string): number => labels.get(name)?.n ?? 0,
    judgedCount: (versionId: string): number => judged.get(versionId)?.n ?? 0,
    createVersion: (v: NewJudgeVersion): JudgeVersion =>
      parse(
        must(
          insertVersion.get(v.id ?? uuid7(), v.judge_name, v.number, v.parent_id ?? null, v.scope ?? 'transcript', v.prompt, v.model, toJson(v.params), toJson(v.examples), v.content_hash, v.created_by, v.note ?? null, nowIso()),
          'judge_version',
        ),
      ),
    activate: (name: string, versionId: string): Judge | null => activate.get(versionId, name),
    calibrations: (versionId: string): Calibration[] => calibrations.all(versionId),
    putCalibration: (c: Omit<Calibration, 'created_at'>): Calibration => must(insertCalibration.get(c.judge_version_id, c.dataset_id, c.split, c.n, c.tpr, c.tnr, nowIso()), 'calibration'),
    calibratedVersionIds: (): Set<string> => new Set(calibrated.all().map((r) => r.judge_version_id)),
  };
};

export type JudgeRepo = ReturnType<typeof judgeRepo>;
