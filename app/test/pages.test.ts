import { beforeAll, describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db/client.ts';
import { createRepos } from '../src/db/repos/index.ts';
import { createPages } from '../src/pages/index.tsx';
import { json, seed, send, type Seed } from './helpers.ts';

const db = openDatabase(':memory:');
const app = new Hono();
app.route('/', createPages(createRepos(db)));
app.route('/', createApp(db));

const base = 'http://localhost:3000';
const short = (id: string): string => id.slice(-12);
const page = async (path: string): Promise<[number, string]> => {
  const res = await app.request(path);
  return [res.status, await res.text()];
};

type TraceRow = { id: string; dataset_item_id: string };

let s: Seed;
let a: string[];
let b: string[];

beforeAll(async () => {
  s = await seed(app);
  const byRun = async (run: string) => (await json<{ traces: TraceRow[] }>(await send(app, 'GET', `/api/traces?run_id=${run}`))).traces.map((t) => t.id).sort();
  a = await byRun(s.runA);
  b = await byRun(s.runB);
  await send(app, 'PUT', `/api/traces/${b[2]}/scores`, { scores: [{ name: 'exercise_match', source: 'human', verdict: 'fail', note: 'wrong lift' }] });
});

describe('inbox', () => {
  test('GET / lists what waits and the runs with pass rate and delta', async () => {
    const [status, html] = await page('/');
    expect(status).toBe(200);
    expect(html).toContain('Waiting on you');
    expect(html).toContain('regressions · rules-v2 vs rules-v1');
    expect(html).toContain('Verify');
    expect(html).toContain('unlabeled · rules-v2');
    expect(html).toContain('rules-v1');
    expect(html).toContain('/pages.css');
    expect(html).toContain('<symbol id="i-paw"');
    expect(html).toContain('<link rel="icon" href="/favicon.svg"');
  });

  test('serves the paw favicon and redirects /favicon.ico to it', async () => {
    const svg = await app.request('/favicon.svg');
    expect(svg.status).toBe(200);
    expect(svg.headers.get('content-type')).toContain('image/svg+xml');
    expect(await svg.text()).toContain('<svg');
    const ico = await app.request('/favicon.ico');
    expect(ico.status).toBe(302);
    expect(ico.headers.get('location')).toBe('/favicon.svg');
  });

  test('GET /inbox renders the same page', async () => {
    const [status, html] = await page('/inbox');
    expect(status).toBe(200);
    expect(html).toContain('Waiting on you');
  });
});

describe('runs', () => {
  test('GET /runs and GET /runs?dataset= list runs; an unknown dataset is a 404 page', async () => {
    const [status, html] = await page('/runs');
    expect(status).toBe(200);
    expect(html).toContain('rules-v1');
    expect(html).toContain('rules-v2');
    expect((await page(`/runs?dataset=${s.datasetId}`))[0]).toBe(200);
    const [missing, body] = await page('/runs?dataset=nope');
    expect(missing).toBe(404);
    expect(body).toContain('Not here');
  });

  test('GET /runs/:id shows stat cards, trace rows with verdict pills, and the two buttons', async () => {
    const [status, html] = await page(`/runs/${s.runB}`);
    expect(status).toBe(200);
    expect(html).toContain('exercise_match');
    expect(html).toContain('Compare with rules-v1');
    expect(html).toContain('Review 2 unlabeled');
    for (const id of b) expect(html).toContain(short(id));
    expect(html).toContain('pill pill-fail');
    expect(html).toContain('unlabeled</span>');
    expect(html).toContain(`data-selected="1"`);
    expect((await page(`/runs/${s.runB}?score=exercise_match`))[0]).toBe(200);
    expect((await page('/runs/nope'))[0]).toBe(404);
  });
});

describe('compare', () => {
  test('shows every item, the run chips, and the toggle off', async () => {
    const [status, html] = await page(`/datasets/${s.datasetId}/compare?runs=${s.runA},${s.runB}`);
    expect(status).toBe(200);
    expect(html).toContain('Only changes');
    expect(html).toContain('aria-pressed="false"');
    for (const id of s.itemIds) expect(html).toContain(short(id));
    expect(html).toContain('class="linkrow changed"');
    expect(html).toContain('class="linkrow improved"');
    expect(html).toContain('/client/compare.js');
  });

  test('?only=changes drops unchanged rows and marks the toggle pressed', async () => {
    const [status, html] = await page(`/datasets/${s.datasetId}/compare?runs=${s.runA},${s.runB}&only=changes&score=exercise_match`);
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
    const [status, html] = await page(`/datasets/${s.datasetId}/compare?runs=${s.runA},${runC}`);
    expect(status).toBe(200);
    expect(html).toContain('<td class="out">squat · 5 · 5 · 315</td>');
    expect(html).not.toContain('{"');
    expect(html).not.toContain('{&quot;');
    expect(html).toContain('<td class="item">');
    expect(html).toContain('class="strong mono id"');
    expect(html).toContain('1 → 0');
    const [, trace] = await page('/traces/obj-1');
    expect(trace).toContain('<p class="transcript values">squat · 5 · 5 · 315</p>');
    expect(trace).toContain('<p class="transcript values">bench</p>');
  });

  test('unknown dataset is 404, one run is 400', async () => {
    expect((await page(`/datasets/nope/compare?runs=${s.runA},${s.runB}`))[0]).toBe(404);
    expect((await page(`/datasets/${s.datasetId}/compare?runs=${s.runA}`))[0]).toBe(400);
  });
});

describe('trace', () => {
  test('renders input, output, expected, scores, and the Label button', async () => {
    const [status, html] = await page(`/traces/${a[0]}`);
    expect(status).toBe(200);
    expect(html).toContain('Label');
    expect(html).toContain('exercise_match');
    expect(html).toContain('bench');
    expect(html).toContain(`/review/${a[0]}?run=${s.runA}`);
  });

  test('a labeled trace shows the human verdict; ?turn= and unknown ids behave', async () => {
    const [, html] = await page(`/traces/${b[2]}?turn=1`);
    expect(html).toContain('Change verdict');
    expect(html).toContain('wrong lift');
    expect((await page('/traces/nope'))[0]).toBe(404);
  });
});

describe('review', () => {
  test('GET /review?run= redirects to the first unlabeled trace', async () => {
    const res = await app.request(`/review?run=${s.runB}&filter=unlabeled`);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${base}/review/${b[0]}?run=${s.runB}`);
    const all = await app.request(`/review?run=${s.runB}&filter=all`);
    expect(all.headers.get('location')).toBe(`${base}/review/${b[0]}?run=${s.runB}&filter=all`);
    expect((await page('/review?run=nope'))[0]).toBe(404);
  });

  test('GET /review/:id renders the counter, the verdict buttons, and the next link', async () => {
    const [status, html] = await page(`/review/${b[0]}?run=${s.runB}`);
    expect(status).toBe(200);
    expect(html).toContain('2 <span class="muted">left</span>');
    expect(html).toContain('data-verdict="pass"');
    expect(html).toContain('>Pass<span class="kbd">1</span>');
    expect(html).toContain('data-verdict="fail"');
    expect(html).toContain('data-verdict="defer"');
    expect(html).toContain(`data-next="${base}/review/${b[1]}?run=${s.runB}"`);
    expect(html).toContain('data-score="exercise_match"');
    expect(html).toContain('id="note"');
    expect(html).toContain('/client/review.js');
    expect(html).toContain(`data-dataset="${s.datasetId}"`);
    expect((await page('/review/nope'))[0]).toBe(404);
  });

  test('a fully labeled run shows the empty state', async () => {
    for (const id of b.slice(0, 2)) await send(app, 'PUT', `/api/traces/${id}/scores`, { scores: [{ name: 'exercise_match', source: 'human', verdict: 'pass' }] });
    const [status, html] = await page(`/review?run=${s.runB}`);
    expect(status).toBe(200);
    expect(html).toContain('Nothing to label');
  });
});

describe('assets', () => {
  test('serves pages.css and the built client modules', async () => {
    const css = await app.request('/pages.css');
    expect(css.status).toBe(200);
    expect(await css.text()).toContain('.verdict-row');
    const review = await app.request('/client/review.js');
    expect(review.status).toBe(200);
    expect(review.headers.get('content-type')).toContain('javascript');
    expect(await review.text()).toContain('keydown');
    expect((await app.request('/client/compare.js')).status).toBe(200);
    expect((await app.request('/client/nope.js')).status).toBe(404);
  });
});
