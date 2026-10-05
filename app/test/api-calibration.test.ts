import { beforeAll, describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import { json, seed, send, testApp, type Seed } from './helpers.ts';

type Rates = { tpr: number; tnr: number; n: number };
type Report = { version: number; dataset_id: string | null; tpr: number; tnr: number; n: number; corrected: number | null; ci: [number, number] | null; observed: number; scored: number; dev: Rates; test: Rates; examples: number; calibrated: boolean; url: string };
type RunView = { aggregates: { scores: Record<string, { mean: number; n: number }>; pending: string[] } };
type JudgeView = { status: string; versions: { number: number; calibrated: boolean; calibration: { split: string; dataset_id: string | null; n: number }[] }[] };

const app = testApp();
const base = 'http://localhost:3000';
const calIds = Array.from({ length: 30 }, (_, i) => `cal-${String(i).padStart(2, '0')}`);
const humanPass = (id: string): boolean => Number(id.slice(-2)) % 2 === 0;

const judgeScore = (versionId: string, value: number) => ({ name: 'exercise_match', value, source: 'judge', judge_version_id: versionId });

let s: Seed;
let runC = '';
let runD = '';
let good = '';
let bad = '';

beforeAll(async () => {
  s = await seed(app);
  const run = async (name: string) => (await json<{ id: string }>(await send(app, 'POST', '/api/runs', { dataset_id: s.datasetId, name }))).id;
  runC = await run('labeled');
  runD = await run('unlabeled');
  const trace = (id: string, run_id: string) => ({ id, project: 'copper', run_id, input: 'x', output: { exercise: 'bench' }, start: '2026-09-13T10:00:00.000Z' });
  await send(app, 'POST', '/api/traces/batch', { traces: calIds.map((id) => trace(id, runC)) });
  await send(app, 'POST', '/api/traces/batch', { traces: [0, 1, 2, 3].map((i) => trace(`d-${i}`, runD)) });
  good = (await json<{ id: string }>(await send(app, 'POST', '/api/judges/exercise_match/versions', { prompt: 'p {{output}}', model: 'fake:contains', created_by: 'agent' }))).id;
  for (const id of calIds) {
    const pass = humanPass(id);
    await send(app, 'PUT', `/api/traces/${id}/scores`, { scores: [judgeScore(good, pass ? 1 : 0), { name: 'exercise_match', source: 'human', verdict: pass ? 'pass' : 'fail' }] });
  }
  for (const [i, value] of [1, 1, 0, 1].entries()) await send(app, 'PUT', `/api/traces/d-${i}/scores`, { scores: [judgeScore(good, value)] });
});

describe('POST /api/judges/{name}/versions/{n}/calibrate', () => {
  test('an uncalibrated judge is pending in the run aggregates and its scores do not count', async () => {
    const run = await json<RunView>(await send(app, 'GET', `/api/runs/${runD}`));
    expect(run.aggregates.scores).toEqual({});
    expect(run.aggregates.pending).toEqual(['exercise_match']);
  });

  test('splits by trace id, stores dev and test rows, and reports the corrected rate with an interval', async () => {
    const res = await send(app, 'POST', '/api/judges/exercise_match/versions/1/calibrate', {});
    expect(res.status).toBe(200);
    const r = await json<Report>(res);
    expect(r).toMatchObject({ version: 1, dataset_id: null, tpr: 1, tnr: 1, n: 15, scored: 34, examples: 4, calibrated: true, url: `${base}/judges/exercise_match/versions/1` });
    expect(r.dev).toEqual({ tpr: 1, tnr: 1, n: 11 });
    expect(r.test).toEqual({ tpr: 1, tnr: 1, n: 15 });
    expect(r.observed).toBeCloseTo(18 / 34, 10);
    expect(r.corrected).toBeCloseTo(18 / 34, 10);
    expect(r.ci?.[0]).toBeLessThanOrEqual(18 / 34);
    expect(r.ci?.[1]).toBeGreaterThanOrEqual(18 / 34);
    const judge = await json<JudgeView>(await send(app, 'GET', '/api/judges/exercise_match'));
    expect(judge.status).toBe('calibrated');
    expect(judge.versions[0]?.calibration.map((c) => [c.split, c.n])).toEqual([['dev', 11], ['test', 15]]);
  });

  test('a calibrated version counts in the aggregates and leaves pending empty', async () => {
    const run = await json<RunView>(await send(app, 'GET', `/api/runs/${runD}`));
    expect(run.aggregates.scores).toEqual({ exercise_match: { mean: 0.75, n: 4 } });
    expect(run.aggregates.pending).toEqual([]);
  });

  test('a version that always passes has TNR 0, stays pending, and marks the score name pending again', async () => {
    bad = (await json<{ id: string }>(await send(app, 'POST', '/api/judges/exercise_match/versions', { from_version: 1, prompt: 'always {{output}}', created_by: 'agent' }))).id;
    for (const id of calIds) await send(app, 'PUT', `/api/traces/${id}/scores`, { scores: [judgeScore(bad, 1)] });
    await send(app, 'PUT', '/api/traces/d-0/scores', { scores: [judgeScore(bad, 1)] });
    const r = await json<Report>(await send(app, 'POST', '/api/judges/exercise_match/versions/2/calibrate', {}));
    expect(r).toMatchObject({ version: 2, tpr: 1, tnr: 0, n: 15, corrected: null, ci: null, calibrated: false });
    const judge = await json<JudgeView>(await send(app, 'GET', '/api/judges/exercise_match'));
    expect(judge.versions.find((v) => v.number === 2)?.calibrated).toBe(false);
    expect(judge.status).toBe('calibrated');
    const run = await json<RunView>(await send(app, 'GET', `/api/runs/${runD}`));
    expect(run.aggregates.scores).toEqual({ exercise_match: { mean: 0.75, n: 4 } });
    expect(run.aggregates.pending).toEqual(['exercise_match']);
  });

  test('--dataset restricts the pairs to the source traces of the items and stamps the rows', async () => {
    const labels = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'copper', name: `labels-${uuid7()}`, purpose: 'judge_labels' }));
    await send(app, 'PUT', `/api/datasets/${labels.id}/items`, { items: calIds.slice(0, 10).map((id) => ({ id: uuid7(), input: 'x', source_trace_id: id })) });
    const r = await json<Report>(await send(app, 'POST', '/api/judges/exercise_match/versions/1/calibrate', { dataset_id: labels.id }));
    expect(r).toMatchObject({ dataset_id: labels.id, examples: 1, calibrated: true });
    expect(r.dev.n).toBe(5);
    expect(r.test.n).toBe(4);
    const judge = await json<JudgeView>(await send(app, 'GET', '/api/judges/exercise_match'));
    expect(judge.versions.find((v) => v.number === 1)?.calibration.map((c) => c.dataset_id)).toEqual([labels.id, labels.id]);
  });

  test('unknown judge, version, or dataset is 404; a bad version number is 400', async () => {
    expect((await send(app, 'POST', '/api/judges/nope/versions/1/calibrate', {})).status).toBe(404);
    expect((await send(app, 'POST', '/api/judges/exercise_match/versions/9/calibrate', {})).status).toBe(404);
    expect((await send(app, 'POST', '/api/judges/exercise_match/versions/1/calibrate', { dataset_id: 'nope' })).status).toBe(404);
    expect((await send(app, 'POST', '/api/judges/exercise_match/versions/x/calibrate', {})).status).toBe(400);
  });
});
