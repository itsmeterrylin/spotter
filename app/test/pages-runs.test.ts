import { beforeAll, describe, expect, test } from 'bun:test';
import { json, page, pageApp, type PageSeed, seedPages, send } from './helpers.ts';

const { app } = pageApp();
const base = 'http://localhost:3000';
const short = (id: string): string => id.slice(-12);

let s: PageSeed;

beforeAll(async () => {
  s = await seedPages(app);
});

describe('runs', () => {
  test('GET / and GET /runs render the runs table with dataset, pass rate, delta, and status', async () => {
    const [status, html] = await page(app, '/');
    expect(status).toBe(200);
    expect(html).toContain('<th>Name</th><th>Dataset</th><th>Started</th><th class="num">Pass rate</th><th class="num">Delta</th><th>Status</th>');
    expect(html).toContain(`<tr class="linkrow" data-href="${base}/runs/${s.runB}">`);
    expect(html).toContain(`href="${base}/runs/${s.runB}">rules-v2</a>`);
    expect(html).toContain(`href="${base}/runs/${s.runA}">rules-v1</a>`);
    expect(html).toContain(`href="${base}/datasets/${s.datasetId}">golden-`);
    expect(html).toContain('<td class="num strong">67%</td>');
    expect(html).toContain('aria-label="no change"');
    expect(html).toContain('<td class="num"><span class="muted">–</span></td>');
    expect(html).toContain('Running');
    expect(html).toContain('/client/rows.js');
    expect(html.indexOf('rules-v2')).toBeLessThan(html.indexOf('rules-v1'));
    expect((await page(app, '/runs'))[1]).toContain('rules-v2');
  });

  test('the primary action compares the newest run with its baseline', async () => {
    const [, html] = await page(app, '/runs');
    expect(html).toContain(`<a class="btn btn-primary" href="${base}/datasets/${s.datasetId}/compare?runs=${s.runA}%2C${s.runB}&amp;only=changes">`);
    expect(html).toContain('Compare</a>');
  });

  test('GET /runs?dataset= filters and shows the dataset in the breadcrumb; an unknown dataset is a 404 page', async () => {
    const [status, html] = await page(app, `/runs?dataset=${s.datasetId}`);
    expect(status).toBe(200);
    expect(html).toContain(`<a href="${base}/datasets">Datasets</a>`);
    expect(html).toContain(`<a href="${base}/datasets/${s.datasetId}">golden-`);
    const [missing, body] = await page(app, '/runs?dataset=nope');
    expect(missing).toBe(404);
    expect(body).toContain('Not here');
  });

  test('a run with ended_at shows Done and a delta up or down', async () => {
    const id = (await json<{ id: string }>(await send(app, 'POST', '/api/runs', { dataset_id: s.datasetId, name: 'rules-v3' }))).id;
    await send(app, 'POST', '/api/traces/batch', {
      traces: s.itemIds.map((item, i) => ({ id: `v3-${i}`, project: 'copper', run_id: id, dataset_item_id: item, input: 'x', output: { exercise: 'bench' }, start: '2026-09-13T10:00:00.000Z', scores: [{ name: 'exercise_match', value: 1, source: 'sdk' }] })),
    });
    await send(app, 'PATCH', `/api/runs/${id}`, {});
    const [, html] = await page(app, '/runs');
    expect(html).toContain('Done');
    expect(html).toContain('aria-label="up"');
    expect(html).toContain('33 pts');
  });

  test('GET /runs/:id shows stat cards, trace rows with verdict pills, and the two buttons', async () => {
    const [status, html] = await page(app, `/runs/${s.runB}`);
    expect(status).toBe(200);
    expect(html).toContain('<h1 class="t-title heavy">rules-v2</h1>');
    expect(html).toContain(`<a href="${base}/runs?dataset=${s.datasetId}">Runs</a>`);
    expect(html).toContain('exercise_match');
    expect(html).toContain('Compare with rules-v1');
    expect(html).toContain('Review 2 unlabeled');
    for (const id of s.b) expect(html).toContain(short(id));
    expect(html).toContain('pill pill-fail');
    expect(html).toContain('unlabeled</span>');
    expect(html).toContain(`data-selected="1"`);
    expect((await page(app, `/runs/${s.runB}?score=exercise_match`))[0]).toBe(200);
    expect((await page(app, '/runs/nope'))[0]).toBe(404);
  });
});
