import { beforeAll, describe, expect, test } from 'bun:test';
import { json, page, pageApp, type PageSeed, seedPages, send } from './helpers.ts';

const { app } = pageApp();
const short = (id: string): string => id.slice(-12);

let s: PageSeed;

beforeAll(async () => {
  s = await seedPages(app);
});

describe('compare', () => {
  test('shows every item, the run chips, the toggle off, and the runs breadcrumb', async () => {
    const [status, html] = await page(app, `/datasets/${s.datasetId}/compare?runs=${s.runA},${s.runB}`);
    expect(status).toBe(200);
    expect(html).toContain('<h1 class="t-title heavy">Compare</h1>');
    expect(html).toContain('>Runs</a>');
    expect(html).toContain('>rules-v2</a>');
    expect(html).toContain('Only changes');
    expect(html).toContain('aria-pressed="false"');
    for (const id of s.itemIds) expect(html).toContain(short(id));
    expect(html).toContain('class="linkrow changed"');
    expect(html).toContain('class="linkrow improved"');
    expect(html).toContain('/client/compare.js');
    expect(html).toContain('class="nav-item pill-brand" href="http://localhost:3000/runs"');
  });

  test('?only=changes drops unchanged rows and marks the toggle pressed', async () => {
    const [status, html] = await page(app, `/datasets/${s.datasetId}/compare?runs=${s.runA},${s.runB}&only=changes&score=exercise_match`);
    expect(status).toBe(200);
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain(short(s.itemIds[0] ?? ''));
    expect(html).toContain(short(s.itemIds[1] ?? ''));
    expect(html).toContain(short(s.itemIds[2] ?? ''));
    expect(html).toContain('data-score="exercise_match" data-selected="1"');
  });

  test('object outputs render as their values joined, ids never wrap, and deltas show raw values', async () => {
    const runC = (await json<{ id: string }>(await send(app, 'POST', '/api/runs', { dataset_id: s.datasetId, name: 'rules-v3' }))).id;
    await send(app, 'POST', '/api/traces/batch', {
      traces: [{ id: 'obj-1', project: 'copper', run_id: runC, dataset_item_id: s.itemIds[0], input: { transcript: 'x' }, output: { exercise: 'squat', sets: 5, reps: 5, weight: 315 }, expected: { exercise: 'bench' }, start: '2026-09-13T10:00:00.000Z', scores: [{ name: 'exercise_match', value: 0, source: 'sdk' }] }],
    });
    const [status, html] = await page(app, `/datasets/${s.datasetId}/compare?runs=${s.runA},${runC}`);
    expect(status).toBe(200);
    expect(html).toContain('<td class="out">squat · 5 · 5 · 315</td>');
    expect(html).not.toContain('{"');
    expect(html).not.toContain('{&quot;');
    expect(html).toContain('<td class="item">');
    expect(html).toContain('class="strong mono id"');
    expect(html).toContain('1 → 0');
    const [, trace] = await page(app, '/traces/obj-1');
    expect(trace).toContain('<p class="transcript values">squat · 5 · 5 · 315</p>');
    expect(trace).toContain('<p class="transcript values">bench</p>');
  });

  test('unknown dataset is 404, one run is 400', async () => {
    expect((await page(app, `/datasets/nope/compare?runs=${s.runA},${s.runB}`))[0]).toBe(404);
    expect((await page(app, `/datasets/${s.datasetId}/compare?runs=${s.runA}`))[0]).toBe(400);
  });
});
