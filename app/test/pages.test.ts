import { beforeAll, describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db/client.ts';
import { createRepos } from '../src/db/repos/index.ts';
import { createPages } from '../src/pages/index.tsx';
import { json, seed, send, type Seed } from './helpers.ts';

const db = openDatabase(':memory:');
const repos = createRepos(db);
const app = new Hono();
app.route('/', createPages(repos));
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

describe('judges', () => {
  test('empty card when there are no judges; unknown name is 404', async () => {
    const [status, html] = await page('/judges');
    expect(status).toBe(200);
    expect(html).toContain('No judges yet');
    expect((await page('/judges/nope'))[0]).toBe(404);
  });

  test('renders judges and versions from the repository', async () => {
    repos.judges.ensure('exercise_match');
    const v = repos.judges.createVersion({ judge_name: 'exercise_match', number: 1, prompt: 'p', model: 'm', content_hash: 'h', created_by: 'human', note: 'first draft' });
    repos.judges.activate('exercise_match', v.id);
    repos.judges.putCalibration({ judge_version_id: v.id, dataset_id: null, split: 'test', n: 40, tpr: 0.94, tnr: 0.88 });
    const [, list] = await page('/judges');
    expect(list).toContain('exercise_match');
    expect(list).toContain('Calibrated');
    const [status, html] = await page('/judges/exercise_match');
    expect(status).toBe(200);
    expect(html).toContain('v1');
    expect(html).toContain('Active');
    expect(html).toContain('94%');
    expect(html).toContain('first draft');
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
