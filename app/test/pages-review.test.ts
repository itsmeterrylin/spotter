import { beforeAll, describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import { page, pageApp, type PageSeed, seedPages, send } from './helpers.ts';

const { app } = pageApp();
const base = 'http://localhost:3000';

let s: PageSeed;

beforeAll(async () => {
  s = await seedPages(app);
});

describe('trace', () => {
  test('renders input, output, expected, scores, the Label button, and the run breadcrumb', async () => {
    const [status, html] = await page(app, `/traces/${s.a[0]}`);
    expect(status).toBe(200);
    expect(html).toContain('Label');
    expect(html).toContain('exercise_match');
    expect(html).toContain('bench');
    expect(html).toContain(`/review/${s.a[0]}?run=${s.runA}`);
    expect(html).toContain(`<a href="${base}/runs/${s.runA}">rules-v1</a>`);
    expect(html).toContain('class="nav-item pill-brand" href="http://localhost:3000/traces"');
  });

  test('a labeled trace shows the human verdict; ?turn= and unknown ids behave', async () => {
    const [, html] = await page(app, `/traces/${s.b[2]}?turn=1`);
    expect(html).toContain('Change verdict');
    expect(html).toContain('wrong lift');
    expect((await page(app, '/traces/nope'))[0]).toBe(404);
  });
});

describe('review', () => {
  test('GET /review?run= redirects to the first unlabeled trace', async () => {
    const res = await app.request(`/review?run=${s.runB}&filter=unlabeled`);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${base}/review/${s.b[0]}?run=${s.runB}`);
    const all = await app.request(`/review?run=${s.runB}&filter=all`);
    expect(all.headers.get('location')).toBe(`${base}/review/${s.b[0]}?run=${s.runB}&filter=all`);
    expect((await page(app, '/review?run=nope'))[0]).toBe(404);
  });

  test('GET /review/:id renders the counter, the verdict buttons, and the next link', async () => {
    const [status, html] = await page(app, `/review/${s.b[0]}?run=${s.runB}`);
    expect(status).toBe(200);
    expect(html).toContain('<h1 class="t-title heavy">Review</h1>');
    expect(html).toContain('2 <span class="muted">left</span>');
    expect(html).toContain('data-verdict="pass"');
    expect(html).toContain('>Pass<span class="kbd">1</span>');
    expect(html).toContain('data-verdict="fail"');
    expect(html).toContain('data-verdict="defer"');
    expect(html).toContain(`data-next="${base}/review/${s.b[1]}?run=${s.runB}"`);
    expect(html).toContain(`data-home="${base}/notifications"`);
    expect(html).toContain('data-score="exercise_match"');
    expect(html).toContain('id="note"');
    expect(html).toContain('/client/review.js');
    expect(html).toContain(`data-dataset="${s.datasetId}"`);
    expect((await page(app, '/review/nope'))[0]).toBe(404);
  });

  test('a conversation renders a verdict row per assistant turn plus one for the transcript; ?turn= focuses that row', async () => {
    const id = uuid7();
    const messages = [
      { turn: 1, role: 'user', content: 'log bench' },
      { turn: 2, role: 'assistant', content: 'bench press logged' },
      { turn: 3, role: 'user', content: 'and squat' },
      { turn: 4, role: 'assistant', content: 'squat logged' },
    ];
    await send(app, 'POST', '/api/traces/batch', { traces: [{ id, project: 'copper', run_id: s.runA, messages, start: '2026-09-13T10:00:00.000Z' }] });
    await send(app, 'PUT', `/api/traces/${id}/scores`, { scores: [{ name: 'exercise_match', source: 'human', verdict: 'fail', turn: 4 }, { name: 'tone', value: 1, turn: 2, source: 'sdk' }] });
    const [status, html] = await page(app, `/review/${id}?run=${s.runA}`);
    expect(status).toBe(200);
    expect(html.match(/class="verdict-row verdict-row-turn"/g)).toHaveLength(2);
    expect(html).toContain('class="verdict-row" data-turn="" data-verdict="" data-focus="1"');
    expect(html).toContain('data-turn="4" data-verdict="fail"');
    expect(html).toContain('data-turn="2" data-verdict=""');
    expect(html).toContain('tone · sdk');
    const [, focused] = await page(app, `/review/${id}?run=${s.runA}&turn=2`);
    expect(focused).toContain('data-turn="2" data-verdict="" data-focus="1"');
    expect(focused).not.toContain('data-turn="" data-verdict="" data-focus="1"');
    const [, tracePage] = await page(app, `/traces/${id}?turn=4`);
    expect(tracePage).toContain('id="turn-4" data-focus="1"');
    expect(tracePage).toContain('exercise_match · human');
  });

  test('a fully labeled run shows the empty state', async () => {
    for (const id of s.b.slice(0, 2)) await send(app, 'PUT', `/api/traces/${id}/scores`, { scores: [{ name: 'exercise_match', source: 'human', verdict: 'pass' }] });
    const [status, html] = await page(app, `/review?run=${s.runB}`);
    expect(status).toBe(200);
    expect(html).toContain('Nothing to label');
    expect(html).toContain(`href="${base}/notifications">Notifications</a>`);
  });
});
