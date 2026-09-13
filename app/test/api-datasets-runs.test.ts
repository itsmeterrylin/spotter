import { describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import { json, seed, send, testApp } from './helpers.ts';

type Err = { error: { code: string; message: string } };

describe('POST /api/datasets', () => {
  const app = testApp();

  test('creates, then returns the existing dataset by name, with a url', async () => {
    const res = await send(app, 'POST', '/api/datasets', { project: 'copper', name: 'golden', description: 'seed' });
    expect(res.status).toBe(201);
    const ds = await json<{ id: string; url: string; item_count: number }>(res);
    expect(ds.url).toBe(`http://localhost:3000/datasets/${ds.id}/items`);
    expect(ds.item_count).toBe(0);
    const again = await send(app, 'POST', '/api/datasets', { project: 'copper', name: 'golden' });
    expect(again.status).toBe(200);
    expect((await json<{ id: string }>(again)).id).toBe(ds.id);
    expect((await send(app, 'GET', `/api/datasets/${ds.id}`)).status).toBe(200);
  });

  test('400 on a missing name, 409 on the same name with another id', async () => {
    const bad = await send(app, 'POST', '/api/datasets', { project: 'copper' });
    expect(bad.status).toBe(400);
    expect((await json<Err>(bad)).error.code).toBe('invalid');
    const dup = await send(app, 'POST', '/api/datasets', { id: uuid7(), project: 'copper', name: 'golden' });
    expect(dup.status).toBe(409);
    expect((await json<Err>(dup)).error.code).toBe('conflict');
  });

  test('400 on a body that is not JSON', async () => {
    const res = await app.request('/api/datasets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/datasets/:id/items', () => {
  const app = testApp();

  test('upserts by client id and reports the count', async () => {
    const ds = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'copper', name: 'items' }));
    const id = uuid7();
    const res = await send(app, 'PUT', `/api/datasets/${ds.id}/items`, { items: [{ id, input: 'a' }, { id: uuid7(), input: 'b' }] });
    expect(res.status).toBe(200);
    expect(await json<{ upserted: number; url: string }>(res)).toEqual({ upserted: 2, url: `http://localhost:3000/datasets/${ds.id}/items` });
    await send(app, 'PUT', `/api/datasets/${ds.id}/items`, { items: [{ id, input: 'a2' }] });
    expect((await json<{ item_count: number }>(await send(app, 'GET', `/api/datasets/${ds.id}`))).item_count).toBe(2);
  });

  test('404 on an unknown dataset, 400 on an empty list', async () => {
    expect((await send(app, 'PUT', `/api/datasets/${uuid7()}/items`, { items: [{ id: uuid7(), input: 1 }] })).status).toBe(404);
    const ds = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'copper', name: 'empty' }));
    expect((await send(app, 'PUT', `/api/datasets/${ds.id}/items`, { items: [] })).status).toBe(400);
  });
});

describe('runs', () => {
  const app = testApp();

  test('POST creates a run with a url; 404 for an unknown dataset; 409 for a reused id', async () => {
    const ds = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'copper', name: 'runs' }));
    const id = uuid7();
    const res = await send(app, 'POST', '/api/runs', { id, dataset_id: ds.id, name: 'v1', metadata: { model: 'm' } });
    expect(res.status).toBe(201);
    expect((await json<{ url: string }>(res)).url).toBe(`http://localhost:3000/runs/${id}`);
    expect((await send(app, 'POST', '/api/runs', { id, dataset_id: ds.id, name: 'v1' })).status).toBe(200);
    expect((await send(app, 'POST', '/api/runs', { id, dataset_id: ds.id, name: 'v2' })).status).toBe(409);
    expect((await send(app, 'POST', '/api/runs', { dataset_id: uuid7(), name: 'v1' })).status).toBe(404);
  });

  test('GET /api/runs/:id returns aggregates that count only eligible scores', async () => {
    const s = await seed(app);
    const res = await send(app, 'GET', `/api/runs/${s.runA}`);
    expect(res.status).toBe(200);
    const run = await json<{ aggregates: { trace_count: number; scores: Record<string, { mean: number; n: number }>; p50_duration_ms: number; tokens: { total: number } } }>(res);
    expect(run.aggregates.trace_count).toBe(3);
    expect(run.aggregates.scores.exercise_match?.mean).toBeCloseTo(2 / 3);
    expect(run.aggregates.p50_duration_ms).toBe(1000);
    expect(run.aggregates.tokens.total).toBe(45);
    expect((await send(app, 'GET', `/api/runs/${uuid7()}`)).status).toBe(404);
  });

  test('GET /api/runs/:id/summary?compare_to counts improvements and regressions per item', async () => {
    const s = await seed(app);
    const res = await send(app, 'GET', `/api/runs/${s.runB}/summary?compare_to=${s.runA}`);
    expect(res.status).toBe(200);
    const body = await json<{ scores: Record<string, { mean: number; diff: number; improvements: number; regressions: number }>; url: string }>(res);
    const m = body.scores.exercise_match;
    expect(m?.improvements).toBe(1);
    expect(m?.regressions).toBe(1);
    expect(m?.diff).toBeCloseTo(0);
    expect(body.url).toContain(`/datasets/${s.datasetId}/compare?runs=${s.runA}%2C${s.runB}&only=changes`);
    expect((await send(app, 'GET', `/api/runs/${s.runB}/summary?compare_to=${uuid7()}`)).status).toBe(404);
  });

  test('GET /api/datasets/:id/compare?only=changes keeps only changed items', async () => {
    const s = await seed(app);
    const all = await json<{ items: { changed: boolean }[] }>(await send(app, 'GET', `/api/datasets/${s.datasetId}/compare?runs=${s.runA},${s.runB}`));
    expect(all.items).toHaveLength(3);
    const res = await send(app, 'GET', `/api/datasets/${s.datasetId}/compare?runs=${s.runA},${s.runB}&only=changes`);
    const body = await json<{ items: { item_id: string; cells: Record<string, { scores: Record<string, number> }> }[]; summary: Record<string, { diff: number }>; url: string }>(res);
    expect(body.items.map((i) => i.item_id).sort()).toEqual(s.itemIds.slice(1).sort());
    expect(body.summary.exercise_match?.diff).toBeCloseTo(0);
    expect(body.url).toContain('only=changes');
    expect((await send(app, 'GET', `/api/datasets/${s.datasetId}/compare?runs=${s.runA}`)).status).toBe(400);
    expect((await send(app, 'GET', `/api/datasets/${s.datasetId}/compare?runs=${s.runA},${uuid7()}`)).status).toBe(404);
  });
});
