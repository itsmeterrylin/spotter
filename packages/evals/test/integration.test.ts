import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../../app/src/app.ts';
import { openDatabase } from '../../../app/src/db/client.ts';
import { init } from '../src/init.ts';

const root = new URL('../../../', import.meta.url).pathname;
const cli = join(root, 'packages/evals/src/cli.ts');
const evalFile = 'evals/tagging.example.ts';

let server: ReturnType<typeof Bun.serve>;
const origin = (): string => `http://127.0.0.1:${server.port}`;

beforeAll(() => {
  server = Bun.serve({ port: 0, fetch: createApp(openDatabase(':memory:')).fetch });
});
afterAll(() => server.stop(true));

const local = (url: string): string => {
  const u = new URL(url);
  u.host = new URL(origin()).host;
  return u.toString();
};

const line = (out: string, prefix: string): string => out.split('\n').find((l) => l.startsWith(prefix))?.slice(prefix.length).trim() ?? '';

async function spotter(args: string[], env: Record<string, string> = {}): Promise<{ code: number; out: string; err: string }> {
  const proc = Bun.spawn(['bun', cli, ...args], { cwd: root, env: { ...process.env, SPOTTER_URL: origin(), ...env }, stdout: 'pipe', stderr: 'pipe' });
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { code, out, err };
}

const status = async (url: string): Promise<number> => (await fetch(local(url))).status;

describe('spotter run against a live server', () => {
  let runA = '';
  let runB = '';

  test('refuses to run against a dataset that does not exist without --create', async () => {
    const { code, err } = await spotter(['run', evalFile]);
    expect(code).toBe(1);
    expect(err).toContain('--create');
  });

  test('--create seeds the dataset, posts traces, and prints the run url', async () => {
    const started = performance.now();
    const { code, out } = await spotter(['run', evalFile, '--create']);
    expect(code).toBe(0);
    expect(performance.now() - started).toBeLessThan(5000);
    expect(out).toContain('exercise_match  0.917     -             0            0');
    expect(line(out, 'compare')).toContain('no previous run');
    const runUrl = line(out, 'run');
    expect(runUrl).toMatch(/^http:\/\/localhost:3000\/runs\/[0-9a-f-]{36}$/);
    runA = runUrl.split('/').pop() ?? '';
    const run = (await (await fetch(`${origin()}/api/runs/${runA}`)).json()) as { ended_at: string | null; metadata: { model: string; git_sha: string } };
    expect(run.ended_at).not.toBeNull();
    expect(run.metadata.model).toBe('rules-v1');
    expect(run.metadata.git_sha).toMatch(/^[0-9a-f]{40}$/);
    const page = (await (await fetch(`${origin()}/api/traces?run_id=${runA}&limit=50`)).json()) as {
      traces: { dataset_item_id: string | null; metrics: { duration_ms?: number } | null; scores: { source: string; name: string }[] }[];
    };
    expect(page.traces).toHaveLength(12);
    expect(page.traces.every((t) => t.dataset_item_id?.startsWith('tagging-') && typeof t.metrics?.duration_ms === 'number')).toBe(true);
    expect(page.traces.every((t) => t.scores.length === 2 && t.scores.every((s) => s.source === 'sdk'))).toBe(true);
  });

  test('--baseline compares v2 against v1 and prints urls that resolve', async () => {
    const { code, out } = await spotter(['run', evalFile, '--baseline', runA], { TAGGING_RULES: 'v2' });
    expect(code).toBe(0);
    expect(out).toContain('exercise_match  0.833  -0.083             1            2');
    expect(out).toContain('weight_found    1.000  +0.000             0            0');
    runB = line(out, 'run').split('/').pop() ?? '';
    const compareUrl = line(out, 'compare');
    expect(compareUrl).toContain(`/compare?runs=${runA}%2C${runB}&only=changes`);
    expect(await status(line(out, 'run'))).toBe(200);
    expect(await status(compareUrl)).toBe(200);
    expect(await status(`${origin()}/api/runs/${runB}/summary?compare_to=${runA}`)).toBe(200);
  });

  test('without --baseline the previous run on the dataset is the baseline', async () => {
    const { code, out } = await spotter(['run', evalFile], { TAGGING_RULES: 'v2' });
    expect(code).toBe(0);
    const runC = line(out, 'run').split('/').pop() ?? '';
    expect(line(out, 'compare')).toContain(`runs=${runB}%2C${runC}`);
    expect(out).toContain('exercise_match  0.833  +0.000             0            0');
  });

  test('spotter compare prints the same table for two run ids', async () => {
    const { code, out } = await spotter(['compare', runA, runB]);
    expect(code).toBe(0);
    expect(out).toContain('exercise_match  0.833  -0.083             1            2');
    expect(line(out, 'compare')).toContain(`runs=${runA}%2C${runB}`);
  });

  test('init writes an eval file from the answers, runs it once, and prints the inbox link', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'spotter-init-'));
    await Bun.write(join(dir, 'task.ts'), 'export const task = (item: { input: unknown }) => item.input;\n');
    const answers = ['first eval', join(dir, 'task.ts'), 'exact_match, second'];
    process.env.SPOTTER_URL = origin();
    const out = await init(() => answers.shift() ?? null, dir);
    delete process.env.SPOTTER_URL;
    expect(out.startsWith('wrote evals/first-eval.ts')).toBe(true);
    expect(out).toMatch(/exact_match\s+0\.000/);
    expect(out).toMatch(/second\s+0\.000/);
    expect(line(out, 'inbox')).toBe(`${origin()}/`);
    expect(await Bun.file(join(dir, 'evals/first-eval.ts')).text()).toContain("dataset: 'first eval'");
  });
});
