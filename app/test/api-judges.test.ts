import { beforeAll, describe, expect, test } from 'bun:test';
import { json, seed, send, testApp, type Seed } from './helpers.ts';

type Version = { id: string; number: number; parent_id: string | null; content_hash: string; active: boolean; note: string | null; existing?: boolean; url: string };
type JudgeView = { name: string; active_version: number | null; status: string; labels: number; versions: Version[]; url: string };
type Err = { error: { code: string } };

const app = testApp();
const base = 'http://localhost:3000';
const propose = (name: string, body: Record<string, unknown>) => send(app, 'POST', `/api/judges/${name}/versions`, { created_by: 'agent', ...body });

describe('judge versions', () => {
  test('the first proposal creates the judge, version 1, and activates it', async () => {
    const res = await propose('exercise_match', { prompt: 'Does {{output}} match {{expected}}?', model: 'fake:contains', note: 'first draft' });
    expect(res.status).toBe(201);
    const v = await json<Version>(res);
    expect(v).toMatchObject({ number: 1, parent_id: null, active: true, existing: false, url: `${base}/judges/exercise_match/versions/1` });
    expect(v.content_hash).toMatch(/^[0-9a-f]{64}$/);
    const judge = await json<JudgeView>(await send(app, 'GET', '/api/judges/exercise_match'));
    expect(judge).toMatchObject({ active_version: 1, status: 'needs_labels', labels: 0, url: `${base}/judges/exercise_match` });
    expect(judge.versions).toHaveLength(1);
  });

  test('the same definition returns the existing version; a change makes v2 with a parent and no activation', async () => {
    const same = await propose('exercise_match', { prompt: 'Does {{output}} match {{expected}}?', model: 'fake:contains', note: 'again' });
    expect(same.status).toBe(200);
    expect(await json<Version>(same)).toMatchObject({ number: 1, existing: true });
    const changed = await propose('exercise_match', { from_version: 1, prompt: 'Strictly: does {{output}} match {{expected}}?', note: 'stricter' });
    expect(changed.status).toBe(201);
    const v2 = await json<Version>(changed);
    const v1 = (await json<JudgeView>(await send(app, 'GET', '/api/judges/exercise_match'))).versions.find((v) => v.number === 1);
    expect(v2).toMatchObject({ number: 2, parent_id: v1?.id, active: false });
    const reordered = await propose('exercise_match', { from_version: 1, params: { b: 1, a: 2 } });
    const again = await propose('exercise_match', { from_version: 1, params: { a: 2, b: 1 } });
    expect((await json<Version>(reordered)).number).toBe(3);
    expect(await json<Version>(again)).toMatchObject({ number: 3, existing: true });
  });

  test('a first version without prompt and model is 400; an unknown from_version is 404', async () => {
    expect((await propose('empty', { note: 'no body' })).status).toBe(400);
    expect((await json<Err>(await propose('exercise_match', { from_version: 9 }))).error.code).toBe('not_found');
    expect((await send(app, 'GET', '/api/judges/nope')).status).toBe(404);
  });

  test('activate moves the pointer and appends an audit line; rollback is activation of an older version', async () => {
    const res = await send(app, 'POST', '/api/judges/exercise_match/activate', { version: 2 });
    expect(res.status).toBe(200);
    const judge = await json<JudgeView>(res);
    expect(judge.active_version).toBe(2);
    const v2 = judge.versions.find((v) => v.number === 2);
    expect(v2?.note).toMatch(/^stricter\nactivated \d{4}-\d{2}-\d{2}T.*; previous v1$/);
    const back = await json<JudgeView>(await send(app, 'POST', '/api/judges/exercise_match/activate', { version: 1 }));
    expect(back.active_version).toBe(1);
    expect(back.versions.find((v) => v.number === 1)?.note).toMatch(/first draft\nactivated .*; previous v2$/);
    expect((await send(app, 'POST', '/api/judges/exercise_match/activate', { version: 9 })).status).toBe(404);
    expect((await send(app, 'POST', '/api/judges/exercise_match/activate', {})).status).toBe(400);
  });

  test('GET /api/judges lists every judge with status and counts', async () => {
    const list = await json<{ judges: { name: string; version_count: number; status: string; disagreements: number }[]; url: string }>(await send(app, 'GET', '/api/judges'));
    expect(list.url).toBe(`${base}/judges`);
    expect(list.judges.find((j) => j.name === 'exercise_match')).toMatchObject({ version_count: 3, status: 'needs_labels', disagreements: 0 });
  });
});

describe('disagreements', () => {
  let s: Seed;
  let ids: string[] = [];
  let versionId = '';

  beforeAll(async () => {
    s = await seed(app);
    ids = (await json<{ traces: { id: string }[] }>(await send(app, 'GET', `/api/traces?run_id=${s.runA}`))).traces.map((t) => t.id).sort();
    versionId = (await json<Version>(await propose('exercise_match', { from_version: 1 }))).id;
    const judge = (value: number, reason: string) => ({ name: 'exercise_match', value, reason, source: 'judge', judge_version_id: versionId });
    const human = (verdict: string) => ({ name: 'exercise_match', verdict, source: 'human' });
    await send(app, 'PUT', `/api/traces/${ids[0]}/scores`, { scores: [judge(1, 'looks right'), human('pass')] });
    await send(app, 'PUT', `/api/traces/${ids[1]}/scores`, { scores: [judge(1, 'looks right'), human('fail')] });
    await send(app, 'PUT', `/api/traces/${ids[2]}/scores`, { scores: [judge(0, 'nope'), human('defer')] });
  });

  test('lists traces where human and judge differ in pass or fail, ignoring defers', async () => {
    const res = await send(app, 'GET', '/api/judges/exercise_match/disagreements?version=1');
    expect(res.status).toBe(200);
    const body = await json<{ version: number; traces: { trace_id: string; human: { value: number }; judge: { value: number; reason: string }; url: string }[]; url: string }>(res);
    expect(body.version).toBe(1);
    expect(body.traces).toHaveLength(1);
    expect(body.traces[0]).toMatchObject({ trace_id: ids[1], human: { value: 0 }, judge: { value: 1, reason: 'looks right' } });
    expect(body.traces[0]?.url).toBe(`${base}/review/${ids[1]}?run=${s.runA}&judge=exercise_match&version=1`);
    expect(body.url).toBe(`${base}/judges/exercise_match/disagreements?version=1`);
    const active = await json<{ version: number }>(await send(app, 'GET', '/api/judges/exercise_match/disagreements'));
    expect(active.version).toBe(1);
    expect((await send(app, 'GET', '/api/judges/exercise_match/disagreements?version=9')).status).toBe(404);
  });

  test('judge scores from two versions live side by side on a trace', async () => {
    const other = (await json<Version>(await propose('exercise_match', { from_version: 1, prompt: 'other {{output}}' }))).id;
    await send(app, 'PUT', `/api/traces/${ids[0]}/scores`, { scores: [{ name: 'exercise_match', value: 0, source: 'judge', judge_version_id: other }] });
    const trace = await json<{ scores: { source: string; judge_version_id: string | null }[] }>(await send(app, 'GET', `/api/traces/${ids[0]}`));
    expect(trace.scores.filter((x) => x.source === 'judge').map((x) => x.judge_version_id).sort()).toEqual([versionId, other].sort());
    const list = await json<{ judges: { name: string; labels: number; disagreements: number }[] }>(await send(app, 'GET', '/api/judges'));
    expect(list.judges.find((j) => j.name === 'exercise_match')).toMatchObject({ labels: 2, disagreements: 1 });
  });
});
