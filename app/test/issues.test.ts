import { beforeEach, describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import type { Hono } from 'hono';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db/client.ts';
import { createRepos, type Repos } from '../src/db/repos/index.ts';
import { ApiError } from '../src/errors.ts';
import { fingerprint, transitionIssue, upsertIssue } from '../src/services/issues.ts';
import { json, send } from './helpers.ts';

const rows = (repos: Repos, table: 'issue' | 'issue_trace'): number => repos.db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM ${table}`).get()?.n ?? 0;

const snapshot = (repos: Repos) => ({
  issues: repos.db.query('SELECT * FROM issue ORDER BY id').all(),
  occurrences: repos.db.query('SELECT * FROM issue_trace ORDER BY trace_id, turn').all(),
});

const errorOf = (fn: () => unknown): ApiError | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof ApiError ? e : null;
  }
};

describe('fingerprint', () => {
  test('derives a key from the title', () => {
    expect(fingerprint('The reply slips into Dutch!')).toBe('reply slips into dutch');
    expect(fingerprint('  Refund   promised, with NO booking.  ')).toBe('refund promised no booking');
    expect(fingerprint('A guest is upset in the lobby')).toBe('guest upset lobby');
    expect(fingerprint('Wifi password was wrong on 2nd floor')).toBe('wifi password wrong 2nd floor');
    expect(fingerprint('Antwoord in het Nederlands — café')).toBe('antwoord het nederlands café');
  });

  test('uses a given fingerprint trimmed and lowercased', () => {
    expect(fingerprint('anything', '  Language-Leak/NL ')).toBe('language-leak/nl');
    expect(fingerprint('The title wins', '   ')).toBe('title wins');
  });

  test('a title of only stopwords has no key', () => {
    expect(fingerprint('The, of the!')).toBe('');
  });
});

describe('upsertIssue', () => {
  let repos: Repos;
  let traces: string[];

  beforeEach(() => {
    repos = createRepos(openDatabase(':memory:'));
    const project = repos.projects.ensure('concierge');
    traces = [uuid7(), uuid7(), uuid7()];
    for (const id of traces) repos.traces.insert({ id, project_id: project.id, start: '2026-10-01T10:00:00.000Z' });
  });

  const file = (title: string, occurrences: Array<{ trace_id: string; turn?: number }>) =>
    upsertIssue(repos, { project: 'concierge', title, traces: occurrences, created_by: 'agent' });

  test('a new fingerprint inserts an open issue with its occurrences', () => {
    const result = file('Reply slips into Dutch', [{ trace_id: traces[0] ?? '', turn: 3 }]);
    expect(result).toMatchObject({ status: 'open', created: true, suppressed: false, added: 1 });
    expect(result.url).toBe(`http://localhost:3000/issues/${result.id}`);
    expect(rows(repos, 'issue')).toBe(1);
    expect(rows(repos, 'issue_trace')).toBe(1);
  });

  test('the same upsert twice leaves the same database state', () => {
    const input = [{ trace_id: traces[0] ?? '', turn: 3 }, { trace_id: traces[1] ?? '' }];
    file('Reply slips into Dutch', input);
    const before = snapshot(repos);
    const again = file('Reply slips into Dutch', input);
    expect(again).toMatchObject({ created: false, suppressed: false, added: 0 });
    expect(snapshot(repos)).toEqual(before);
    expect(rows(repos, 'issue_trace')).toBe(2);
  });

  test('a whole-trace occurrence dedupes even though turn is null', () => {
    file('Reply slips into Dutch', [{ trace_id: traces[0] ?? '' }]);
    file('Reply slips into Dutch', [{ trace_id: traces[0] ?? '' }]);
    expect(rows(repos, 'issue_trace')).toBe(1);
  });

  test('a different title with the same fingerprint dedupes, keeps the first title, and adds new occurrences', () => {
    const first = file('Reply slips into Dutch', [{ trace_id: traces[0] ?? '', turn: 3 }]);
    const second = file('The reply slips into Dutch!', [{ trace_id: traces[0] ?? '', turn: 3 }, { trace_id: traces[1] ?? '', turn: 5 }]);
    expect(second).toEqual({ id: first.id, status: 'open', created: false, suppressed: false, added: 1, url: first.url });
    expect(rows(repos, 'issue')).toBe(1);
    expect(repos.issues.get(first.id)).toMatchObject({ title: 'Reply slips into Dutch', occurrences: 2, traces: 2 });
  });

  test('a dismissed fingerprint is suppressed and nothing is attached', () => {
    const first = file('Reply slips into Dutch', [{ trace_id: traces[0] ?? '' }]);
    transitionIssue(repos, first.id, 'dismissed', 'human', 'Guest wrote in Dutch first');
    const before = snapshot(repos);
    const again = file('reply slips into dutch', [{ trace_id: traces[1] ?? '' }, { trace_id: traces[2] ?? '' }]);
    expect(again).toEqual({ id: first.id, status: 'dismissed', created: false, suppressed: true, added: 0, url: first.url });
    expect(snapshot(repos)).toEqual(before);
    expect(repos.issues.get(first.id)?.occurrences).toBe(1);
    expect(repos.issues.dismissedFingerprints(repos.projects.getByName('concierge')?.id ?? '')).toEqual(['reply slips into dutch']);
  });

  test('after a human reopens it, the next upsert attaches again', () => {
    const first = file('Reply slips into Dutch', [{ trace_id: traces[0] ?? '' }]);
    transitionIssue(repos, first.id, 'dismissed', 'human', 'false alarm');
    transitionIssue(repos, first.id, 'open', 'human');
    const again = file('Reply slips into Dutch', [{ trace_id: traces[1] ?? '' }]);
    expect(again).toMatchObject({ status: 'open', suppressed: false, added: 1 });
    expect(repos.issues.get(first.id)).toMatchObject({ occurrences: 2, dismissed_reason: null });
  });

  test('unknown traces, judges, and projects are 404 and write nothing', () => {
    expect(errorOf(() => file('Missing trace', [{ trace_id: 'nope' }]))?.status).toBe(404);
    expect(errorOf(() => upsertIssue(repos, { project: 'concierge', title: 'x y', judge_name: 'nope', created_by: 'agent' }))?.status).toBe(404);
    expect(errorOf(() => upsertIssue(repos, { project: 'nope', title: 'x y', created_by: 'agent' }))?.status).toBe(404);
    expect(rows(repos, 'issue')).toBe(0);
  });
});

describe('issue transitions', () => {
  let repos: Repos;
  let id: string;

  beforeEach(() => {
    repos = createRepos(openDatabase(':memory:'));
    repos.projects.ensure('concierge');
    id = upsertIssue(repos, { project: 'concierge', title: 'Reply slips into Dutch', created_by: 'human' }).id;
  });

  test('legal moves succeed in order', () => {
    expect(transitionIssue(repos, id, 'confirmed', 'agent').status).toBe('confirmed');
    expect(transitionIssue(repos, id, 'open', 'agent').status).toBe('open');
    expect(transitionIssue(repos, id, 'dismissed', 'agent', 'not a leak').dismissed_reason).toBe('not a leak');
    expect(transitionIssue(repos, id, 'open', 'human')).toMatchObject({ status: 'open', dismissed_reason: null });
  });

  test('dismissed to confirmed is a 409', () => {
    transitionIssue(repos, id, 'dismissed', 'human', 'false alarm');
    const err = errorOf(() => transitionIssue(repos, id, 'confirmed', 'human'));
    expect(err?.status).toBe(409);
    expect(err?.message).toBe(`issue ${id} cannot move from dismissed to confirmed`);
    expect(repos.issues.get(id)?.status).toBe('dismissed');
  });

  test('only a human reopens a dismissed issue', () => {
    transitionIssue(repos, id, 'dismissed', 'human', 'false alarm');
    expect(errorOf(() => transitionIssue(repos, id, 'open', 'agent'))?.status).toBe(409);
    expect(repos.issues.get(id)?.status).toBe('dismissed');
  });

  test('dismissing without a reason is a 400', () => {
    expect(errorOf(() => transitionIssue(repos, id, 'dismissed', 'human', ' '))?.status).toBe(400);
  });
});

describe('issues REST', () => {
  let app: Hono;
  let trace: string;

  beforeEach(async () => {
    app = createApp(openDatabase(':memory:'));
    trace = uuid7();
    await send(app, 'POST', '/api/traces/batch', { traces: [{ id: trace, project: 'concierge', start: '2026-10-01T10:00:00.000Z' }] });
  });

  test('POST creates with 201, repeats with 200, and GET returns the issue with url and occurrences', async () => {
    const body = { project: 'concierge', title: 'Reply slips into Dutch', severity: 'high', seed_trace_id: trace, traces: [{ trace_id: trace, turn: 2 }], created_by: 'human' };
    const created = await send(app, 'POST', '/api/issues', body);
    expect(created.status).toBe(201);
    const { id } = await json<{ id: string }>(created);
    const repeat = await send(app, 'POST', '/api/issues', body);
    expect(repeat.status).toBe(200);
    expect(await repeat.json()).toEqual({ id, status: 'open', created: false, suppressed: false, added: 0, url: `http://localhost:3000/issues/${id}` });
    const issue = await json<Record<string, unknown>>(await send(app, 'GET', `/api/issues/${id}`));
    expect(issue).toMatchObject({ id, title: 'Reply slips into Dutch', severity: 'high', project: 'concierge', occurrences: 1, traces: 1, backtest: null, url: `http://localhost:3000/issues/${id}` });
    expect(issue.occurrence_list).toMatchObject([{ trace_id: trace, turn: 2, created_by: 'human', url: `http://localhost:3000/traces/${trace}?turn=2` }]);
  });

  test('GET lists by status with counts, PATCH transitions, and an illegal move is 409', async () => {
    const { id } = await json<{ id: string }>(await send(app, 'POST', '/api/issues', { project: 'concierge', title: 'Reply slips into Dutch', created_by: 'agent' }));
    const dismissed = await send(app, 'PATCH', `/api/issues/${id}`, { status: 'dismissed', dismissed_reason: 'Guest wrote Dutch' });
    expect(await dismissed.json()).toMatchObject({ status: 'dismissed', dismissed_reason: 'Guest wrote Dutch' });
    const list = await json<{ issues: Array<{ id: string }>; counts: unknown; dismissed_fingerprints: string[]; url: string }>(await send(app, 'GET', '/api/issues?status=dismissed&project=concierge'));
    expect(list.issues.map((i) => i.id)).toEqual([id]);
    expect(list.counts).toEqual({ open: 0, confirmed: 0, dismissed: 1 });
    expect(list.dismissed_fingerprints).toEqual(['reply slips into dutch']);
    expect(list.url).toBe('http://localhost:3000/issues?status=dismissed&project=concierge');
    const illegal = await send(app, 'PATCH', `/api/issues/${id}`, { status: 'confirmed' });
    expect(illegal.status).toBe(409);
    expect(await illegal.json()).toEqual({ error: { code: 'conflict', message: `issue ${id} cannot move from dismissed to confirmed` } });
  });

  test('POST /:id/traces attaches once and a dismissed issue suppresses it', async () => {
    const { id } = await json<{ id: string }>(await send(app, 'POST', '/api/issues', { project: 'concierge', title: 'Reply slips into Dutch', created_by: 'human' }));
    const body = { traces: [{ trace_id: trace, turn: 4, evidence: 'Dank u wel' }] };
    expect(await (await send(app, 'POST', `/api/issues/${id}/traces`, body)).json()).toMatchObject({ added: 1, suppressed: false });
    expect(await (await send(app, 'POST', `/api/issues/${id}/traces`, body)).json()).toMatchObject({ added: 0, suppressed: false });
    await send(app, 'PATCH', `/api/issues/${id}`, { status: 'dismissed', dismissed_reason: 'ok' });
    expect(await (await send(app, 'POST', `/api/issues/${id}/traces`, { traces: [{ trace_id: trace }] })).json()).toMatchObject({ added: 0, suppressed: true, status: 'dismissed' });
  });

  test('PATCH links a judge and the backtest reads its active version scores', async () => {
    const other = uuid7();
    await send(app, 'POST', '/api/traces/batch', { traces: [{ id: other, project: 'concierge', start: '2026-10-01T10:00:00.000Z' }] });
    const v = await json<{ id: string }>(await send(app, 'POST', '/api/judges/language-leak/versions', { prompt: 'Same language?', model: 'fake:contains', scope: 'turn', created_by: 'human' }));
    await send(app, 'PUT', `/api/traces/${trace}/scores`, { scores: [{ name: 'language-leak', value: 0, turn: 3, source: 'judge', judge_version_id: v.id }, { name: 'language-leak', value: 1, turn: 1, source: 'judge', judge_version_id: v.id }] });
    await send(app, 'PUT', `/api/traces/${other}/scores`, { scores: [{ name: 'language-leak', value: 1, turn: 1, source: 'judge', judge_version_id: v.id }] });
    const { id } = await json<{ id: string }>(await send(app, 'POST', '/api/issues', { project: 'concierge', title: 'Reply slips into Dutch', seed_trace_id: trace, created_by: 'human' }));
    const linked = await json<{ judge_name: string; backtest: unknown }>(await send(app, 'PATCH', `/api/issues/${id}`, { judge_name: 'language-leak' }));
    expect(linked.judge_name).toBe('language-leak');
    expect(linked.backtest).toEqual({
      judge: 'language-leak',
      version: 1,
      scope: 'turn',
      scored: 2,
      fails: 1,
      fail_rate: 0.5,
      failing: [{ trace_id: trace, turns: [3], url: `http://localhost:3000/traces/${trace}?turn=3` }],
      command: 'spotter judge run language-leak --run <run_id>',
      url: 'http://localhost:3000/judges/language-leak',
    });
    expect((await send(app, 'PATCH', `/api/issues/${id}`, { judge_name: 'nope' })).status).toBe(404);
  });
});
