import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { createApp } from '../../../app/src/app.ts';
import { openDatabase } from '../../../app/src/db/client.ts';
import { fakeModel, modelFor, openAiModel, parseVerdict, renderPrompt } from '../src/judge.ts';
import { judgeRun } from '../src/judge-run.ts';
import { uuid7 } from '../src/uuid7.ts';

const root = new URL('../../../', import.meta.url).pathname;
const cli = join(root, 'packages/evals/src/cli.ts');

describe('judge prompt and answer', () => {
  test('renderPrompt fills the four placeholders; strings stay raw, objects become JSON', () => {
    const out = renderPrompt('in: {{input}} out: {{ output }} exp: {{expected}} ex: {{examples}}', { input: 'hi', output: { a: 1 }, expected: null, examples: [1] });
    expect(out).toBe('in: hi out: {\n  "a": 1\n} exp:  ex: [\n  1\n]');
  });

  test('parseVerdict takes the first JSON object in the text and needs a boolean pass', () => {
    expect(parseVerdict('Sure. {"pass": true, "reason": "has {braces}"} trailing')).toEqual({ pass: true, reason: 'has {braces}' });
    expect(parseVerdict('{"pass":false}')).toEqual({ pass: false, reason: '' });
    expect(() => parseVerdict('no json here')).toThrow('no JSON object');
    expect(() => parseVerdict('{"verdict": "pass"}')).toThrow('boolean pass');
  });

  test('fake:contains passes when the output contains the expected exercise', async () => {
    const model = fakeModel('contains');
    const ctx = { input: null, expected: { exercise: 'bench press' }, examples: null };
    expect(parseVerdict(await model.complete('', { ...ctx, output: { exercise: 'Bench Press', sets: 3 } })).pass).toBe(true);
    expect(parseVerdict(await model.complete('', { ...ctx, output: { exercise: 'squat' } })).pass).toBe(false);
    expect(() => fakeModel('nope')).toThrow('unknown fake');
  });

  test('a real model needs a key; the fake prefix never touches the network', () => {
    const def = { id: 'v', number: 1, prompt: '', model: 'gpt-x', params: null, examples: null };
    expect(() => modelFor(def, {})).toThrow('SPOTTER_JUDGE_API_KEY');
    expect(openAiModel('gpt-x', null, { SPOTTER_JUDGE_API_KEY: 'k' }).name).toBe('gpt-x');
    expect(modelFor({ ...def, model: 'fake:contains' }, {}).name).toBe('fake:contains');
  });
});

describe('spotter judge run against a live server', () => {
  let server: ReturnType<typeof Bun.serve>;
  const origin = (): string => `http://127.0.0.1:${server.port}`;
  const api = async (method: string, path: string, body?: unknown) => (await fetch(`${origin()}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })).json();
  let runId = '';
  let datasetId = '';
  let versionId = '';

  beforeAll(async () => {
    server = Bun.serve({ port: 0, fetch: createApp(openDatabase(':memory:')).fetch });
    const ds = (await api('POST', '/api/datasets', { project: 'copper', name: 'judge-run' })) as { id: string };
    datasetId = ds.id;
    const items = [uuid7(), uuid7(), uuid7()];
    await api('PUT', `/api/datasets/${ds.id}/items`, { items: items.map((id) => ({ id, input: { transcript: 'bench' }, expected: { exercise: 'bench press' } })) });
    runId = ((await api('POST', '/api/runs', { dataset_id: ds.id, name: 'r1' })) as { id: string }).id;
    const outputs = ['bench press', 'squat', 'incline bench press'];
    await api('POST', '/api/traces/batch', {
      traces: items.map((item, i) => ({ id: uuid7(), project: 'copper', run_id: runId, dataset_item_id: item, input: { transcript: 'bench' }, output: { exercise: outputs[i] }, expected: { exercise: 'bench press' }, start: '2026-09-13T10:00:00.000Z' })),
    });
    versionId = ((await api('POST', '/api/judges/exercise_match/versions', { prompt: 'Does {{output}} name {{expected}}? Answer {"pass": true|false, "reason": "..."}', model: 'fake:contains', created_by: 'agent' })) as { id: string }).id;
  });
  afterAll(() => server.stop(true));

  test('scores every trace of the run with source judge and the version id', async () => {
    const report = await judgeRun({ name: 'exercise_match', version: 'active', target: { run: runId }, client: { url: origin() } });
    expect(report).toMatchObject({ judge: 'exercise_match', version: 1, model: 'fake:contains', scored: 3, pass: 2, fail: 1, url: 'http://localhost:3000/judges/exercise_match' });
    const page = (await api('GET', `/api/traces?run_id=${runId}`)) as { traces: { scores: { source: string; judge_version_id: string | null; label: string; reason: string }[] }[] };
    const judged = page.traces.flatMap((t) => t.scores.filter((s) => s.source === 'judge'));
    expect(judged).toHaveLength(3);
    expect(judged.every((s) => s.judge_version_id === versionId)).toBe(true);
    expect(judged.map((s) => s.label).sort()).toEqual(['fail', 'pass', 'pass']);
    expect(judged.find((s) => s.label === 'fail')?.reason).toBe('output lacks bench press');
  });

  test('the CLI prints the counts and the judge url; a missing target or version is an error', async () => {
    const proc = Bun.spawn(['bun', cli, 'judge', 'run', 'exercise_match', '--version', '1', '--run', runId], { cwd: root, env: { ...process.env, SPOTTER_URL: origin() }, stdout: 'pipe', stderr: 'pipe' });
    const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    expect(code).toBe(0);
    expect(out).toContain('judge exercise_match v1 (fake:contains)');
    expect(out).toContain('scored 3: 2 pass, 1 fail');
    expect(out).toContain('judge    http://localhost:3000/judges/exercise_match');
    await expect(judgeRun({ name: 'exercise_match', version: '2', target: { run: runId }, client: { url: origin() } })).rejects.toThrow('version 2');
    await expect(judgeRun({ name: 'exercise_match', version: 'active', target: {}, client: { url: origin() } })).rejects.toThrow('--run');
  });

  test('the CLI calibrates a version against the human labels and prints both splits', async () => {
    const page = (await api('GET', `/api/traces?run_id=${runId}`)) as { traces: { id: string; output: { exercise: string } }[] };
    for (const t of page.traces) await api('PUT', `/api/traces/${t.id}/scores`, { scores: [{ name: 'exercise_match', source: 'human', verdict: t.output.exercise.includes('bench') ? 'pass' : 'fail' }] });
    const proc = Bun.spawn(['bun', cli, 'judge', 'calibrate', 'exercise_match', '--version', '1'], { cwd: root, env: { ...process.env, SPOTTER_URL: origin() }, stdout: 'pipe', stderr: 'pipe' });
    const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    expect(code).toBe(0);
    expect(out).toContain('judge exercise_match v1 calibration:');
    expect(out).toMatch(/dev\s+n=\d+\s+TPR\s+\d+%\s+TNR\s+\d+%/);
    expect(out).toMatch(/test\s+n=\d+\s+TPR\s+\d+%\s+TNR\s+\d+%/);
    expect(out).toContain('over 3 judge scores');
    expect(out).toContain('version  http://localhost:3000/judges/exercise_match/versions/1');
  });

  test('a turn-scoped version scores each assistant turn with the transcript up to that turn', async () => {
    const run2 = ((await api('POST', '/api/runs', { dataset_id: datasetId, name: 'r2' })) as { id: string }).id;
    const messages = [
      { turn: 1, role: 'user', content: 'log bench' },
      { turn: 2, role: 'assistant', content: 'bench press logged' },
      { turn: 3, role: 'user', content: 'and squat' },
      { turn: 4, role: 'assistant', content: 'squat logged' },
    ];
    await api('POST', '/api/traces/batch', { traces: [{ id: uuid7(), project: 'copper', run_id: run2, messages, expected: { exercise: 'bench press' }, start: '2026-09-13T10:00:00.000Z' }] });
    const v2 = (await api('POST', '/api/judges/exercise_match/versions', { scope: 'turn', note: 'per turn', created_by: 'agent' })) as { id: string; number: number };
    const report = await judgeRun({ name: 'exercise_match', version: String(v2.number), target: { run: run2 }, client: { url: origin() } });
    expect(report).toMatchObject({ version: v2.number, scored: 2, pass: 1, fail: 1 });
    const page = (await api('GET', `/api/traces?run_id=${run2}`)) as { traces: { scores: { turn: number | null; value: number; judge_version_id: string }[] }[] };
    const judged = page.traces[0]?.scores ?? [];
    expect(judged.map((s) => [s.turn, s.value])).toEqual([[2, 1], [4, 0]]);
    expect(judged.every((s) => s.judge_version_id === v2.id)).toBe(true);
  });

  test('--dataset scores the source traces of the items and skips items without one', async () => {
    const labels = (await api('POST', '/api/datasets', { project: 'copper', name: 'labels', purpose: 'judge_labels' })) as { id: string };
    const page = (await api('GET', `/api/traces?run_id=${runId}`)) as { traces: { id: string }[] };
    await api('PUT', `/api/datasets/${labels.id}/items`, { items: [{ id: uuid7(), input: 'x', source_trace_id: page.traces[0]?.id }, { id: uuid7(), input: 'y' }] });
    const report = await judgeRun({ name: 'exercise_match', version: '1', target: { dataset: labels.id }, client: { url: origin() } });
    expect(report).toMatchObject({ scored: 1, dataset_id: labels.id });
    expect(datasetId).not.toBe(labels.id);
  });
});
