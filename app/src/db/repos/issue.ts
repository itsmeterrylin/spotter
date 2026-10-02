import type { Database, SQLQueryBindings } from 'bun:sqlite';
import { uuid7 } from '@spotter/evals/uuid7';
import { must, nowIso } from '../json.ts';
import type { CreatedBy, IssueStatus, Severity } from '../types.ts';

export type Issue = {
  id: string;
  project_id: string;
  title: string;
  fingerprint: string;
  status: IssueStatus;
  severity: Severity;
  description: string | null;
  judge_name: string | null;
  seed_trace_id: string | null;
  dismissed_reason: string | null;
  created_by: CreatedBy;
  created_at: string;
  updated_at: string;
};

export type IssueRow = Issue & { occurrences: number; traces: number };

export type Occurrence = { issue_id: string; trace_id: string; turn: number | null; evidence: string | null; created_by: CreatedBy; created_at: string };

export type NewOccurrence = { trace_id: string; turn?: number | null; evidence?: string | null };

export type NewIssue = Pick<Issue, 'project_id' | 'title' | 'fingerprint' | 'severity' | 'description' | 'judge_name' | 'seed_trace_id' | 'created_by'>;

export type IssuePatch = Partial<Pick<Issue, 'title' | 'status' | 'severity' | 'judge_name' | 'dismissed_reason'>>;

export type IssueFilter = { project_id?: string; status?: IssueStatus };

const counted = `SELECT i.*,
  (SELECT COUNT(*) FROM issue_trace o WHERE o.issue_id = i.id) AS occurrences,
  (SELECT COUNT(DISTINCT o.trace_id) FROM issue_trace o WHERE o.issue_id = i.id) AS traces
  FROM issue i`;

export const issueRepo = (db: Database) => {
  const byId = db.query<IssueRow, [string]>(`${counted} WHERE i.id = ?`);
  const listed = db.query<IssueRow, [string | null, IssueStatus | null]>(`${counted} WHERE (i.project_id = ?1 OR ?1 IS NULL) AND (i.status = ?2 OR ?2 IS NULL) ORDER BY i.updated_at DESC, i.id DESC`);
  const byFingerprint = db.query<Issue, [string, string]>('SELECT * FROM issue WHERE project_id = ? AND fingerprint = ?');
  const insert = db.query<Issue, [string, string, string, string, Severity, string | null, string | null, string | null, CreatedBy, string, string]>(
    `INSERT INTO issue (id, project_id, title, fingerprint, severity, description, judge_name, seed_trace_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
  );
  const attach = db.query<Occurrence, [string, string, number | null, string | null, CreatedBy, string]>(
    'INSERT INTO issue_trace (issue_id, trace_id, turn, evidence, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
  );
  const byTrace = db.query<IssueRow, [string]>(`${counted} WHERE i.id IN (SELECT issue_id FROM issue_trace WHERE trace_id = ?) ORDER BY i.updated_at DESC`);
  const occurrences = db.query<Occurrence, [string]>('SELECT * FROM issue_trace WHERE issue_id = ? ORDER BY created_at DESC, trace_id, turn');
  const statusCounts = db.query<{ status: IssueStatus; n: number }, [string | null]>('SELECT status, COUNT(*) AS n FROM issue WHERE project_id = ?1 OR ?1 IS NULL GROUP BY status');
  const dismissed = db.query<{ fingerprint: string }, [string]>("SELECT fingerprint FROM issue WHERE project_id = ? AND status = 'dismissed' ORDER BY fingerprint");

  return {
    get: (id: string): IssueRow | null => byId.get(id),
    getByFingerprint: (projectId: string, fingerprint: string): Issue | null => byFingerprint.get(projectId, fingerprint),
    list: (f: IssueFilter = {}): IssueRow[] => listed.all(f.project_id ?? null, f.status ?? null),
    insert: (n: NewIssue): Issue => {
      const now = nowIso();
      return must(insert.get(uuid7(), n.project_id, n.title, n.fingerprint, n.severity, n.description, n.judge_name, n.seed_trace_id, n.created_by, now, now), 'issue');
    },
    update: (id: string, patch: IssuePatch): void => {
      const keys = Object.keys(patch) as Array<keyof IssuePatch>;
      const values: SQLQueryBindings[] = keys.map((k) => patch[k] ?? null);
      db.query(`UPDATE issue SET ${[...keys.map((k) => `${k} = ?`), 'updated_at = ?'].join(', ')} WHERE id = ?`).run(...values, nowIso(), id);
    },
    attach: (issueId: string, list: NewOccurrence[], createdBy: CreatedBy): number => {
      const now = nowIso();
      return list.reduce((added, o) => added + attach.run(issueId, o.trace_id, o.turn ?? null, o.evidence ?? null, createdBy, now).changes, 0);
    },
    occurrences: (issueId: string): Occurrence[] => occurrences.all(issueId),
    listByTrace: (traceId: string): IssueRow[] => byTrace.all(traceId),
    countByStatus: (projectId?: string): Record<IssueStatus, number> => {
      const out: Record<IssueStatus, number> = { open: 0, confirmed: 0, dismissed: 0 };
      for (const r of statusCounts.all(projectId ?? null)) out[r.status] = r.n;
      return out;
    },
    dismissedFingerprints: (projectId: string): string[] => dismissed.all(projectId).map((r) => r.fingerprint),
  };
};

export type IssueRepo = ReturnType<typeof issueRepo>;
