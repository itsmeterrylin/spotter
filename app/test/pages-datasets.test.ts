import { beforeAll, describe, expect, test } from 'bun:test';
import { page, pageApp, type PageSeed, seedPages } from './helpers.ts';

const { app } = pageApp();
const base = 'http://localhost:3000';
const short = (id: string): string => id.slice(-12);

let s: PageSeed;

beforeAll(async () => {
  s = await seedPages(app);
});

describe('datasets', () => {
  test('GET /datasets lists name, items, runs, and last run', async () => {
    const [status, html] = await page(app, '/datasets');
    expect(status).toBe(200);
    expect(html).toContain('<th>Name</th><th class="num">Items</th><th class="num">Runs</th><th>Last run</th>');
    expect(html).toContain(`<tr class="linkrow" data-href="${base}/datasets/${s.datasetId}">`);
    expect(html).toContain(`href="${base}/datasets/${s.datasetId}">golden-`);
    expect(html).toContain('<td class="num">3</td><td class="num">2</td>');
    expect(html).toContain(`href="${base}/runs/${s.runB}">rules-v2</a>`);
  });

  test('GET /datasets/:id shows the items table, the runs on it, and Compare latest', async () => {
    const [status, html] = await page(app, `/datasets/${s.datasetId}`);
    expect(status).toBe(200);
    expect(html).toContain('<th>Id</th><th>Input</th><th>Expected</th><th>Source</th>');
    for (const id of s.itemIds) expect(html).toContain(short(id));
    expect(html).toContain('set 0');
    expect(html).toContain('<td class="wrap">bench</td>');
    expect(html).toContain('rules-v1');
    expect(html).toContain('rules-v2');
    expect(html).toContain(`<a class="btn btn-primary" href="${base}/datasets/${s.datasetId}/compare?runs=${s.runA}%2C${s.runB}&amp;only=changes">`);
    expect(html).toContain('Compare latest</a>');
    expect(html).toContain(`<a href="${base}/datasets">Datasets</a>`);
    expect((await page(app, '/datasets/nope'))[0]).toBe(404);
  });

  test('/datasets/:id/items redirects to the dataset page', async () => {
    const res = await app.request(`/datasets/${s.datasetId}/items`);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe(`${base}/datasets/${s.datasetId}`);
  });
});

describe('traces', () => {
  test('GET /traces lists every trace with item, run, output, a column per score, and a verdict pill', async () => {
    const [status, html] = await page(app, '/traces');
    expect(status).toBe(200);
    expect(html).toContain('<th>Item</th><th>Run</th><th>Output</th><th class="num" data-score="exercise_match">exercise_match</th><th>Verdict</th>');
    for (const id of [...s.a, ...s.b]) expect(html).toContain(`data-href="${base}/traces/${id}"`);
    expect(html).toContain(`href="${base}/traces?run=${s.runB}">rules-v2</a>`);
    expect(html).toContain('<td class="wrap">bench</td>');
    expect(html).toContain('pill pill-fail');
    expect(html).toContain('unlabeled</span>');
    expect(html).not.toContain('Review unlabeled');
    expect(html).toContain('/client/rows.js');
  });

  test('?run= narrows to one run, adds the breadcrumb, and offers Review unlabeled', async () => {
    const [status, html] = await page(app, `/traces?run=${s.runB}&score=exercise_match`);
    expect(status).toBe(200);
    for (const id of s.b) expect(html).toContain(short(id));
    for (const id of s.a) expect(html).not.toContain(short(id));
    expect(html).toContain(`<a class="btn btn-primary" href="${base}/review?run=${s.runB}&amp;filter=unlabeled">`);
    expect(html).toContain('Review unlabeled');
    expect(html).toContain(`<a href="${base}/runs/${s.runB}">rules-v2</a>`);
    expect(html).toContain('data-score="exercise_match" data-selected="1"');
    expect((await page(app, '/traces?run=nope'))[0]).toBe(404);
  });

  test('?filter= takes the API filter grammar; run_id and filters are accepted too', async () => {
    const filter = encodeURIComponent(JSON.stringify([{ field: 'score', key: 'exercise_match', operator: '=', value: 0 }]));
    const [status, html] = await page(app, `/traces?run=${s.runB}&filter=${filter}`);
    expect(status).toBe(200);
    expect(html).toContain(short(s.b[2] ?? ''));
    expect(html).not.toContain(short(s.b[0] ?? ''));
    expect(html).toContain('1 filter</span>');
    const [alt, altHtml] = await page(app, `/traces?run_id=${s.runB}&filters=${filter}`);
    expect(alt).toBe(200);
    expect(altHtml).toContain(short(s.b[2] ?? ''));
    const bad = encodeURIComponent(JSON.stringify([{ field: 'nope', operator: '=', value: 1 }]));
    expect((await page(app, `/traces?filter=${bad}`))[0]).toBe(400);
  });

  test('an empty database shows the empty state', async () => {
    const fresh = pageApp().app;
    const [status, html] = await page(fresh, '/traces');
    expect(status).toBe(200);
    expect(html).toContain('No traces yet');
  });
});
