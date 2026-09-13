import { describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import { json, seed, send, testApp } from './helpers.ts';

const trace = (over: Record<string, unknown> = {}) => ({ id: uuid7(), project: 'copper', input: 'q', output: 'a', start: '2026-09-13T10:00:00.000Z', ...over });

describe('POST /api/traces/batch', () => {
  const app = testApp();

  test('inserts once and ignores a repeat of the same ids', async () => {
    const traces = [trace({ scores: [{ name: 'ok', value: 1, source: 'sdk' }] }), trace()];
    const first = await send(app, 'POST', '/api/traces/batch', { traces });
    expect(first.status).toBe(201);
    const body = await json<{ inserted: number; skipped: number; urls: string[]; url: string }>(first);
    expect(body.inserted).toBe(2);
    expect(body.skipped).toBe(0);
    expect(body.urls[0]).toBe(`http://localhost:3000/traces/${traces[0]?.id}`);
    const again = await json<{ inserted: number; skipped: number }>(await send(app, 'POST', '/api/traces/batch', { traces }));
    expect(again).toMatchObject({ inserted: 0, skipped: 2 });
    const got = await json<{ scores: { name: string }[] }>(await send(app, 'GET', `/api/traces/${traces[0]?.id}`));
    expect(got.scores).toHaveLength(1);
  });

  test('400 on a bad timestamp, 404 on an unknown run', async () => {
    expect((await send(app, 'POST', '/api/traces/batch', { traces: [trace({ start: 'yesterday' })] })).status).toBe(400);
    expect((await send(app, 'POST', '/api/traces/batch', { traces: [trace({ run_id: uuid7() })] })).status).toBe(404);
  });
});

describe('PUT /api/traces/:id/scores', () => {
  const app = testApp();

  test('replaces by (name, source, turn) and maps verdict and note', async () => {
    const t = trace({ scores: [{ name: 'match', value: 1, source: 'sdk' }] });
    await send(app, 'POST', '/api/traces/batch', { traces: [t] });
    await send(app, 'PUT', `/api/traces/${t.id}/scores`, { scores: [{ name: 'match', verdict: 'fail', note: 'wrong lift', source: 'human' }] });
    const res = await send(app, 'PUT', `/api/traces/${t.id}/scores`, { scores: [{ name: 'match', verdict: 'pass', source: 'human' }] });
    expect(res.status).toBe(200);
    const body = await json<{ scores: { source: string; value: number; label: string | null }[]; url: string }>(res);
    expect(body.scores).toHaveLength(2);
    expect(body.scores.find((s) => s.source === 'human')).toMatchObject({ value: 1, label: 'pass' });
    expect(body.url).toBe(`http://localhost:3000/traces/${t.id}`);
  });

  test('404 on an unknown trace, 400 without value or verdict', async () => {
    expect((await send(app, 'PUT', `/api/traces/${uuid7()}/scores`, { scores: [{ name: 'x', value: 1, source: 'sdk' }] })).status).toBe(404);
    const t = trace();
    await send(app, 'POST', '/api/traces/batch', { traces: [t] });
    expect((await send(app, 'PUT', `/api/traces/${t.id}/scores`, { scores: [{ name: 'x', source: 'sdk' }] })).status).toBe(400);
  });
});

describe('PATCH /api/traces/:id/metadata', () => {
  const app = testApp();

  test('deep-merges metadata and appends events', async () => {
    const t = trace({ metadata: { a: { x: 1, y: 1 }, keep: true }, events: [{ at: '2026-09-13T10:00:00.000Z', name: 'first' }] });
    await send(app, 'POST', '/api/traces/batch', { traces: [t] });
    const res = await send(app, 'PATCH', `/api/traces/${t.id}/metadata`, { metadata: { a: { y: 2, z: 3 } }, events: [{ at: '2026-09-13T10:00:05.000Z', name: 'transfer' }] });
    expect(res.status).toBe(200);
    const body = await json<{ metadata: Record<string, unknown>; events: { name: string }[] }>(res);
    expect(body.metadata).toEqual({ a: { x: 1, y: 2, z: 3 }, keep: true });
    expect(body.events.map((e) => e.name)).toEqual(['first', 'transfer']);
    expect((await send(app, 'PATCH', `/api/traces/${uuid7()}/metadata`, { metadata: {} })).status).toBe(404);
  });
});

describe('GET /api/traces', () => {
  const app = testApp();

  test('filters by run, metadata key, score, and source, with cursor paging', async () => {
    const s = await seed(app);
    const tagged = trace({ run_id: s.runA, metadata: { model: 'gpt', transfer_to: '+1' }, tags: ['voice'] });
    await send(app, 'POST', '/api/traces/batch', { traces: [tagged] });
    await send(app, 'PUT', `/api/traces/${tagged.id}/scores`, { scores: [{ name: 'match', verdict: 'fail', source: 'human' }] });
    const byRun = await json<{ traces: unknown[]; next_cursor: string | null }>(await send(app, 'GET', `/api/traces?run_id=${s.runA}&limit=2`));
    expect(byRun.traces).toHaveLength(2);
    expect(byRun.next_cursor).not.toBeNull();
    const page2 = await json<{ traces: unknown[]; next_cursor: string | null }>(await send(app, 'GET', `/api/traces?run_id=${s.runA}&limit=2&cursor=${byRun.next_cursor}`));
    expect(page2.traces).toHaveLength(2);
    expect(page2.next_cursor).toBeNull();
    const filters = (f: unknown[]) => `/api/traces?filters=${encodeURIComponent(JSON.stringify(f))}`;
    const byMeta = await json<{ traces: { id: string }[]; url: string }>(await send(app, 'GET', filters([{ field: 'metadata.transfer_to', operator: 'starts_with', value: '+' }])));
    expect(byMeta.traces.map((t) => t.id)).toEqual([tagged.id]);
    expect(byMeta.url).toContain('/traces?filters=');
    const byScore = await json<{ traces: unknown[] }>(await send(app, 'GET', filters([{ field: 'score', key: 'exercise_match', operator: '<', value: 1 }, { field: 'run_id', operator: '=', value: s.runB }])));
    expect(byScore.traces).toHaveLength(1);
    const bySource = await json<{ traces: { id: string }[] }>(await send(app, 'GET', filters([{ field: 'source', operator: '=', value: 'human' }, { field: 'tags', operator: 'contains', value: 'voice' }])));
    expect(bySource.traces.map((t) => t.id)).toEqual([tagged.id]);
  });

  test('400 on a bad operator or an unknown field', async () => {
    expect((await send(app, 'GET', `/api/traces?filters=${encodeURIComponent('[{"field":"run_id","operator":"~","value":1}]')}`)).status).toBe(400);
    expect((await send(app, 'GET', `/api/traces?filters=${encodeURIComponent('[{"field":"nope","operator":"=","value":1}]')}`)).status).toBe(400);
  });
});

describe('POST /api/query', () => {
  const app = testApp();

  test('runs one SELECT and rejects writes', async () => {
    await seed(app);
    const res = await send(app, 'POST', '/api/query', { sql: 'SELECT name, COUNT(*) AS n FROM run GROUP BY name ORDER BY name;' });
    expect(res.status).toBe(200);
    const body = await json<{ rows: { name: string; n: number }[]; row_count: number; truncated: boolean; url: string }>(res);
    expect(body.rows.map((r) => r.name)).toEqual(['rules-v1', 'rules-v2']);
    expect(body.truncated).toBe(false);
    expect(body.url).toContain('/query?sql=');
    for (const sql of ['DELETE FROM run', 'SELECT 1; DELETE FROM run', 'SELECT 1 -- x', 'WITH x AS (SELECT 1) INSERT INTO project SELECT * FROM x']) {
      const bad = await send(app, 'POST', '/api/query', { sql });
      expect(bad.status).toBe(400);
    }
    expect((await send(app, 'GET', '/api/nope')).status).toBe(404);
  });
});
