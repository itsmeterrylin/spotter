import { describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import { json, send, testApp } from './helpers.ts';

type Run = { id: string; ended_at: string | null; metadata: Record<string, unknown> | null; url: string };

describe('PATCH /api/runs/:id', () => {
  const app = testApp();

  test('sets ended_at, deep-merges metadata, and keeps the url', async () => {
    const ds = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'copper', name: 'patch' }));
    const run = await json<Run>(await send(app, 'POST', '/api/runs', { dataset_id: ds.id, name: 'v1', metadata: { model: 'm', nested: { a: 1 } } }));
    expect(run.ended_at).toBeNull();
    const res = await send(app, 'PATCH', `/api/runs/${run.id}`, { metadata: { git_sha: 'abc', nested: { b: 2 } } });
    expect(res.status).toBe(200);
    const patched = await json<Run>(res);
    expect(patched.ended_at).not.toBeNull();
    expect(patched.metadata).toEqual({ model: 'm', git_sha: 'abc', nested: { a: 1, b: 2 } });
    expect(patched.url).toBe(run.url);
    const again = await json<Run>(await send(app, 'PATCH', `/api/runs/${run.id}`, {}));
    expect(again.metadata).toEqual(patched.metadata);
  });

  test('404 on an unknown run, 400 on metadata that is not an object', async () => {
    expect((await send(app, 'PATCH', `/api/runs/${uuid7()}`, {})).status).toBe(404);
    const ds = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'copper', name: 'patch-400' }));
    const run = await json<Run>(await send(app, 'POST', '/api/runs', { dataset_id: ds.id, name: 'v1' }));
    expect((await send(app, 'PATCH', `/api/runs/${run.id}`, { metadata: 'nope' })).status).toBe(400);
  });
});
