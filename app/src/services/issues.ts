import type { Repos } from '../db/repos/index.ts';
import type { Issue, IssuePatch, IssueRow, NewOccurrence, Occurrence } from '../db/repos/issue.ts';
import type { Project } from '../db/repos/project.ts';
import type { CreatedBy, IssueStatus, JudgeScope, Severity } from '../db/types.ts';
import { conflict, invalid, notFound } from '../errors.ts';
import { urls } from '../urls.ts';

export const issueStatuses = ['open', 'confirmed', 'dismissed'] as const satisfies readonly IssueStatus[];
export const severities = ['low', 'medium', 'high'] as const satisfies readonly Severity[];

const anyone: readonly CreatedBy[] = ['human', 'agent'];

/** Allowed status moves and who may make each. Anything absent is a 409. */
export const transitions: Record<IssueStatus, Partial<Record<IssueStatus, readonly CreatedBy[]>>> = {
  open: { confirmed: anyone, dismissed: anyone },
  confirmed: { dismissed: anyone, open: anyone },
  dismissed: { open: ['human'] },
};

const stopwords = new Set(['a', 'an', 'the', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'was']);

export function fingerprint(title: string, given?: string | null): string {
  const explicit = given?.trim().toLowerCase();
  if (explicit) return explicit;
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter((w) => w && !stopwords.has(w))
    .join(' ');
}

export type OccurrenceView = Occurrence & { url: string };
export type IssueListRow = IssueRow & { project: string; url: string };
export type FailingTrace = { trace_id: string; turns: number[]; url: string };
export type Backtest = {
  judge: string;
  version: number | null;
  scope: JudgeScope | null;
  scored: number;
  fails: number;
  fail_rate: number | null;
  failing: FailingTrace[];
  command: string;
  url: string;
};
export type IssueView = IssueListRow & { occurrence_list: OccurrenceView[]; backtest: Backtest | null };
export type IssueList = { issues: IssueListRow[]; counts: Record<IssueStatus, number>; dismissed_fingerprints: string[]; url: string };
export type UpsertResult = { id: string; status: IssueStatus; created: boolean; suppressed: boolean; added: number; url: string };
export type AttachResult = { id: string; status: IssueStatus; suppressed: boolean; added: number; url: string };

export type UpsertInput = {
  project: string;
  title: string;
  fingerprint?: string | null;
  severity?: Severity;
  description?: string | null;
  judge_name?: string | null;
  seed_trace_id?: string | null;
  traces?: NewOccurrence[];
  created_by: CreatedBy;
};

export type IssueUpdate = Omit<IssuePatch, 'status'> & { status?: IssueStatus; actor: CreatedBy };

export function resolveProject(repos: Repos, ref: string): Project {
  const project = repos.projects.get(ref) ?? repos.projects.getByName(ref);
  if (!project) throw notFound('project', ref);
  return project;
}

const projectName = (repos: Repos, id: string): string => repos.projects.get(id)?.name ?? id;

const listRow = (repos: Repos, row: IssueRow): IssueListRow => ({ ...row, project: projectName(repos, row.project_id), url: urls.issue(row.id) });

function requireIssue(repos: Repos, id: string): IssueRow {
  const issue = repos.issues.get(id);
  if (!issue) throw notFound('issue', id);
  return issue;
}

function requireTraces(repos: Repos, ids: Array<string | null | undefined>): void {
  for (const id of new Set(ids)) if (id && !repos.traces.get(id)) throw notFound('trace', id);
}

function requireJudge(repos: Repos, name: string | null | undefined): void {
  if (name && !repos.judges.get(name)) throw notFound('judge', name);
}

const runCommand = (judge: string, runId: string | null): string => `spotter judge run ${judge} --run ${runId ?? '<run_id>'}`;

export function backtest(repos: Repos, issue: Issue): Backtest | null {
  if (!issue.judge_name) return null;
  const judge = repos.judges.get(issue.judge_name);
  const version = judge?.active_version_id ? repos.judges.getVersion(judge.active_version_id) : null;
  const seedRun = issue.seed_trace_id ? (repos.traces.get(issue.seed_trace_id)?.run_id ?? null) : null;
  const command = runCommand(issue.judge_name, seedRun ?? repos.runs.list()[0]?.id ?? null);
  const empty = { judge: issue.judge_name, version: version?.number ?? null, scope: version?.scope ?? null, scored: 0, fails: 0, fail_rate: null, failing: [], command, url: urls.judge(issue.judge_name) };
  if (!version) return empty;
  const byTrace = new Map<string, { failed: boolean; turns: number[] }>();
  for (const s of repos.scores.listByJudgeVersion(version.id)) {
    const entry = byTrace.get(s.trace_id) ?? { failed: false, turns: [] };
    if (s.value < 0.5) {
      entry.failed = true;
      if (s.turn !== null) entry.turns.push(s.turn);
    }
    byTrace.set(s.trace_id, entry);
  }
  const failing = [...byTrace].filter(([, e]) => e.failed).map(([trace_id, e]) => ({ trace_id, turns: e.turns, url: urls.trace(trace_id, e.turns[0]) }));
  return { ...empty, scored: byTrace.size, fails: failing.length, fail_rate: byTrace.size ? failing.length / byTrace.size : null, failing };
}

export function getIssue(repos: Repos, id: string): IssueView {
  const issue = requireIssue(repos, id);
  const occurrence_list = repos.issues.occurrences(id).map((o) => ({ ...o, url: urls.trace(o.trace_id, o.turn ?? undefined) }));
  return { ...listRow(repos, issue), occurrence_list, backtest: backtest(repos, issue) };
}

export const issuesForJudge = (repos: Repos, name: string): IssueListRow[] => repos.issues.listByJudge(name).map((r) => listRow(repos, r));

export function listIssues(repos: Repos, q: { project?: string; status?: IssueStatus } = {}): IssueList {
  const project = q.project ? resolveProject(repos, q.project) : null;
  const issues = repos.issues.list({ project_id: project?.id, status: q.status }).map((r) => listRow(repos, r));
  const dismissed = project ? repos.issues.dismissedFingerprints(project.id) : repos.projects.list().flatMap((p) => repos.issues.dismissedFingerprints(p.id));
  return { issues, counts: repos.issues.countByStatus(project?.id), dismissed_fingerprints: dismissed, url: urls.issues({ status: q.status, project: q.project }) };
}

export const dismissedFingerprints = (repos: Repos, project: string): string[] => repos.issues.dismissedFingerprints(resolveProject(repos, project).id);

/** The only write path for agents. Idempotent; a dismissed fingerprint changes nothing. */
export function upsertIssue(repos: Repos, input: UpsertInput): UpsertResult {
  const project = resolveProject(repos, input.project);
  const fp = fingerprint(input.title, input.fingerprint);
  if (!fp) throw invalid('title has no words to fingerprint; pass fingerprint');
  const occurrences = input.traces ?? [];
  requireTraces(repos, [input.seed_trace_id, ...occurrences.map((o) => o.trace_id)]);
  requireJudge(repos, input.judge_name);
  return repos.tx(() => {
    const held = repos.issues.getByFingerprint(project.id, fp);
    if (held?.status === 'dismissed') return { id: held.id, status: held.status, created: false, suppressed: true, added: 0, url: urls.issue(held.id) };
    const issue =
      held ??
      repos.issues.insert({
        project_id: project.id,
        title: input.title.trim(),
        fingerprint: fp,
        severity: input.severity ?? 'medium',
        description: input.description ?? null,
        judge_name: input.judge_name ?? null,
        seed_trace_id: input.seed_trace_id ?? null,
        created_by: input.created_by,
      });
    const added = repos.issues.attach(issue.id, occurrences, input.created_by);
    if (held && added) repos.issues.update(issue.id, {});
    return { id: issue.id, status: issue.status, created: !held, suppressed: false, added, url: urls.issue(issue.id) };
  });
}

export function attachOccurrences(repos: Repos, id: string, occurrences: NewOccurrence[], createdBy: CreatedBy): AttachResult {
  const issue = requireIssue(repos, id);
  if (issue.status === 'dismissed') return { id, status: issue.status, suppressed: true, added: 0, url: urls.issue(id) };
  requireTraces(repos, occurrences.map((o) => o.trace_id));
  const added = repos.tx(() => {
    const n = repos.issues.attach(id, occurrences, createdBy);
    if (n) repos.issues.update(id, {});
    return n;
  });
  return { id, status: issue.status, suppressed: false, added, url: urls.issue(id) };
}

function statusPatch(issue: Issue, to: IssueStatus, actor: CreatedBy, reason: string | null | undefined): IssuePatch {
  if (to === issue.status) return reason !== undefined && to === 'dismissed' ? { dismissed_reason: reason } : {};
  const allowed = transitions[issue.status][to];
  if (!allowed) throw conflict(`issue ${issue.id} cannot move from ${issue.status} to ${to}`);
  if (!allowed.includes(actor)) throw conflict(`only a ${allowed.join(' or ')} can move issue ${issue.id} from ${issue.status} to ${to}`);
  if (to === 'dismissed' && !reason?.trim()) throw invalid('dismissing an issue needs dismissed_reason');
  return { status: to, dismissed_reason: to === 'dismissed' ? (reason?.trim() ?? null) : null };
}

export function updateIssue(repos: Repos, id: string, update: IssueUpdate): IssueView {
  const issue = requireIssue(repos, id);
  const { actor, status, dismissed_reason, ...fields } = update;
  requireJudge(repos, fields.judge_name);
  const patch: IssuePatch = { ...fields, ...(status ? statusPatch(issue, status, actor, dismissed_reason) : {}) };
  if (!status && dismissed_reason !== undefined) {
    if (issue.status !== 'dismissed') throw conflict(`issue ${id} is ${issue.status}; dismissed_reason applies to dismissed issues`);
    patch.dismissed_reason = dismissed_reason;
  }
  if (patch.title !== undefined) patch.title = patch.title.trim();
  if (Object.keys(patch).length) repos.issues.update(id, patch);
  return getIssue(repos, id);
}

export const transitionIssue = (repos: Repos, id: string, status: IssueStatus, actor: CreatedBy, reason?: string | null): IssueView =>
  updateIssue(repos, id, { status, dismissed_reason: reason, actor });
