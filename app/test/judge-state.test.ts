import { describe, expect, test } from 'bun:test';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db/client.ts';
import { createRepos } from '../src/db/repos/index.ts';
import { json, send } from './helpers.ts';

const db = openDatabase(':memory:');
const repos = createRepos(db);
const app = createApp(db);

type View = { name: string; state: string; active_version: number | null };
type Err = { error: { code: string; message: string } };

const propose = (name: string, prompt: string) => send(app, 'POST', `/api/judges/${name}/versions`, { created_by: 'agent', prompt, model: 'fake:contains' });
const move = (name: string, state: string, actor?: string) => send(app, 'PATCH', `/api/judges/${name}`, actor ? { state, actor } : { state });
const calibrate = (name: string, number: number, tpr: number, tnr: number) => {
  const v = repos.judges.getVersionByNumber(name, number);
  repos.judges.putCalibration({ judge_version_id: v?.id ?? '', dataset_id: null, split: 'test', n: 20, tpr, tnr });
};
const stateOf = async (name: string) => (await json<View>(await send(app, 'GET', `/api/judges/${name}`))).state;

describe('judge state', () => {
  test('a new judge is draft in the read, the list, and the version-less row', async () => {
    await propose('alpha', 'one');
    expect(await stateOf('alpha')).toBe('draft');
    const list = await json<{ judges: View[] }>(await send(app, 'GET', '/api/judges'));
    expect(list.judges.map((j) => [j.name, j.state])).toEqual([['alpha', 'draft']]);
  });

  test('draft to paused is illegal', async () => {
    const res = await move('alpha', 'paused');
    expect(res.status).toBe(409);
    expect((await json<Err>(res)).error.message).toBe('judge alpha cannot move from draft to paused');
  });

  test('live without calibration names the labels present and needed', async () => {
    for (const id of ['t1', 't2', 't3', 't4']) {
      await send(app, 'POST', '/api/traces/batch', { traces: [{ id: id, project: 'copper', input: 'x', output: 'y', start: '2026-09-13T10:00:00.000Z' }] });
      await send(app, 'PUT', `/api/traces/${id}/scores`, { scores: [{ name: 'alpha', source: 'human', verdict: 'pass' }] });
    }
    const res = await move('alpha', 'live');
    expect(res.status).toBe(409);
    expect((await json<Err>(res)).error.message).toBe('judge alpha cannot go live: needs labels, 4 of 100 collected');
    expect(await stateOf('alpha')).toBe('draft');
  });

  test('live with calibration below the bar names the failing rates', async () => {
    calibrate('alpha', 1, 0.8, 0.95);
    const res = await move('alpha', 'live');
    expect(res.status).toBe(409);
    expect((await json<Err>(res)).error.message).toBe('judge alpha cannot go live: v1 test TPR 80% and TNR 95% must both reach 90%');
  });

  test('an agent cannot set a calibrated judge live', async () => {
    calibrate('alpha', 1, 0.92, 0.95);
    const res = await move('alpha', 'live', 'agent');
    expect(res.status).toBe(409);
    expect((await json<Err>(res)).error.message).toBe('only a human can move judge alpha from draft to live');
  });

  test('a human takes the calibrated judge live, then it pauses, returns, and demotes', async () => {
    expect((await json<View>(await move('alpha', 'live'))).state).toBe('live');
    expect((await json<View>(await move('alpha', 'paused', 'agent'))).state).toBe('paused');
    expect((await json<View>(await move('alpha', 'live'))).state).toBe('live');
    expect((await json<View>(await move('alpha', 'draft', 'agent'))).state).toBe('draft');
    expect((await move('alpha', 'bogus')).status).toBe(400);
    expect((await move('nope', 'live')).status).toBe(404);
  });

  test('activating an uncalibrated version demotes a live judge; a calibrated one keeps it live', async () => {
    await move('alpha', 'live');
    await propose('alpha', 'two');
    await propose('alpha', 'three');
    calibrate('alpha', 3, 0.91, 0.91);
    await send(app, 'POST', '/api/judges/alpha/activate', { version: 3 });
    expect(await stateOf('alpha')).toBe('live');
    await send(app, 'POST', '/api/judges/alpha/activate', { version: 2 });
    expect(await stateOf('alpha')).toBe('draft');
  });

  test('activating an uncalibrated version leaves a draft judge draft and a paused judge paused', async () => {
    await send(app, 'POST', '/api/judges/alpha/activate', { version: 3 });
    await move('alpha', 'live');
    await move('alpha', 'paused');
    await send(app, 'POST', '/api/judges/alpha/activate', { version: 2 });
    expect(await stateOf('alpha')).toBe('paused');
  });
});
