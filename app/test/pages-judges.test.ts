import { beforeAll, describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db/client.ts';
import { createRepos } from '../src/db/repos/index.ts';
import { createPages } from '../src/pages/index.tsx';
import { json, seed, send } from './helpers.ts';

const db = openDatabase(':memory:');
const app = new Hono();
app.route('/', createPages(createRepos(db)));
app.route('/', createApp(db));

const base = 'http://localhost:3000';
const ids = Array.from({ length: 30 }, (_, i) => `cal-${String(i).padStart(2, '0')}`);
const humanPass = (id: string): boolean => Number(id.slice(-2)) % 2 === 0;
const page = async (path: string): Promise<[number, string]> => {
  const res = await app.request(path);
  return [res.status, await res.text()];
};
const propose = async (body: Record<string, unknown>) => (await json<{ id: string; number: number }>(await send(app, 'POST', '/api/judges/exercise_match/versions', { created_by: 'agent', ...body }))).id;
const judgeAll = async (versionId: string, judgeValue: (id: string) => number) => {
  for (const id of ids) {
    const scores = [{ name: 'exercise_match', value: judgeValue(id), source: 'judge', judge_version_id: versionId }, { name: 'exercise_match', source: 'human', verdict: humanPass(id) ? 'pass' : 'fail' }];
    await send(app, 'PUT', `/api/traces/${id}/scores`, { scores });
  }
};

let runId = '';

describe('judges pages', () => {
  test('empty card when there are no judges; unknown name is 404', async () => {
    const [status, html] = await page('/judges');
    expect(status).toBe(200);
    expect(html).toContain('No judges yet');
    expect((await page('/judges/nope'))[0]).toBe(404);
    expect((await page('/judges/nope/versions/1'))[0]).toBe(404);
    expect((await page('/judges/nope/disagreements'))[0]).toBe(404);
  });

  describe('with a calibrated judge', () => {
    beforeAll(async () => {
      const s = await seed(app);
      runId = (await json<{ id: string }>(await send(app, 'POST', '/api/runs', { dataset_id: s.datasetId, name: 'labeled' }))).id;
      await send(app, 'POST', '/api/traces/batch', { traces: ids.map((id) => ({ id, project: 'copper', run_id: runId, input: 'x', output: { exercise: 'bench' }, start: '2026-09-13T10:00:00.000Z' })) });
      const v1 = await propose({ prompt: 'Does {{output}} match {{expected}}?', model: 'fake:contains', note: 'first draft' });
      await judgeAll(v1, (id) => (id === 'cal-00' || id === 'cal-04' ? 0 : humanPass(id) ? 1 : 0));
      await send(app, 'POST', '/api/judges/exercise_match/versions/1/calibrate', {});
      const v2 = await propose({ from_version: 1, prompt: 'Strictly: does {{output}} match {{expected}}?', note: 'stricter' });
      await judgeAll(v2, (id) => (humanPass(id) ? 1 : 0));
      await send(app, 'POST', '/api/judges/exercise_match/versions/2/calibrate', {});
      await propose({ from_version: 2, prompt: 'Draft three {{output}}', note: 'unscored' });
    });

    test('GET /judges lists the judge with its status pill and a disagreements link', async () => {
      const [status, html] = await page('/judges');
      expect(status).toBe(200);
      expect(html).toContain('exercise_match');
      expect(html).toContain('v1 active');
      expect(html).toContain('3 versions');
      expect(html).toContain('Calibrated');
      expect(html).toContain(`href="${base}/judges/exercise_match/disagreements?version=1">2 disagreements</a>`);
    });

    test('GET /judges/:name shows the timeline newest first with bars, notes, the active marker, and the activate form', async () => {
      const [status, html] = await page('/judges/exercise_match');
      expect(status).toBe(200);
      expect(html.indexOf('>v3<')).toBeLessThan(html.indexOf('>v2<'));
      expect(html.indexOf('>v2<')).toBeLessThan(html.indexOf('>v1<'));
      expect(html).toContain('Active');
      expect(html).toContain('TPR · test · n=15');
      expect(html).toContain('bar bar-pass');
      expect(html).toContain('first draft');
      expect(html).toContain('stricter');
      expect(html).toContain('Needs labels');
      expect(html).toContain('action="/judges/exercise_match/activate"');
      expect(html).toContain('Activate v2');
      expect(html).not.toContain('Activate v3');
      expect(html).toContain('2 disagreements');
    });

    test('GET /judges/:name/versions/:n shows the definition and calibration; bad numbers are 404 or 400', async () => {
      const [status, html] = await page('/judges/exercise_match/versions/2');
      expect(status).toBe(200);
      expect(html).toContain('Strictly: does {{output}} match {{expected}}?');
      expect(html).toContain('fake:contains');
      expect(html).toContain('>v1</a>');
      expect(html).toContain('dev split');
      expect(html).toContain('test split');
      expect(html).toContain('Activate v2');
      expect((await page('/judges/exercise_match/versions/3'))[1]).toContain('Needs labels');
      expect((await page('/judges/exercise_match/versions/9'))[0]).toBe(404);
      expect((await page('/judges/exercise_match/versions/x'))[0]).toBe(400);
    });

    test('disagreements redirect into the review queue, which shows what the judge said', async () => {
      const res = await app.request('/judges/exercise_match/disagreements?version=1');
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(`${base}/review?judge=exercise_match&version=1`);
      expect((await app.request('/judges/exercise_match/disagreements')).headers.get('location')).toBe(`${base}/review?judge=exercise_match&version=1`);
      expect((await page('/judges/exercise_match/disagreements?version=9'))[0]).toBe(404);
      const review = await app.request('/review?judge=exercise_match&version=1');
      expect(review.status).toBe(302);
      expect(review.headers.get('location')).toBe(`${base}/review/cal-00?judge=exercise_match&version=1`);
      const [status, html] = await page('/review/cal-00?judge=exercise_match&version=1');
      expect(status).toBe(200);
      expect(html).toContain('Judge v1 said fail');
      expect(html).toContain('2 <span class="muted">left</span>');
      expect(html).toContain('disagreements with exercise_match v1');
      expect(html).toContain(`data-next="${base}/review/cal-04?run=${runId}&amp;judge=exercise_match&amp;version=1"`);
      expect(html).toContain('aria-pressed="true"');
      expect((await page('/review?judge=exercise_match&version=2'))[1]).toContain('Nothing to label');
    });

    test('notifications list disagreements with the active version and the labels still needed', async () => {
      const [, html] = await page('/notifications');
      expect(html).toContain('<span class="strong num">2</span> disagreements <span class="muted">· exercise_match v1</span>');
      expect(html).toContain(`href="${base}/judges/exercise_match/disagreements?version=1">Resolve</a>`);
      expect(html).toContain('<span class="strong num">70</span> labels needed <span class="muted">· exercise_match</span>');
      expect(html).toContain(`href="${base}/review?filter=unlabeled">Label</a>`);
    });

    test('POST /judges/:name/activate moves the pointer and redirects; a bad version is 400 or 404', async () => {
      const post = (version: string) => app.request('/judges/exercise_match/activate', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `version=${version}` });
      const res = await post('2');
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe(`${base}/judges/exercise_match`);
      const [, html] = await page('/judges/exercise_match');
      expect(html).toContain('Activate v1');
      expect(html).not.toContain('Activate v2');
      expect(html).toContain('previous v1');
      expect((await post('9')).status).toBe(404);
      expect((await post('x')).status).toBe(400);
    });

  });
});
