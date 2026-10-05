import { uuid7 } from '@spotter/evals/uuid7';
import { Hono } from 'hono';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db/client.ts';
import { createRepos, type Repos } from '../src/db/repos/index.ts';
import { createPages } from '../src/pages/index.tsx';

export const testApp = (): Hono => createApp(openDatabase(':memory:'));

export const send = (app: Hono, method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

export const json = async <T>(res: Response): Promise<T> => (await res.json()) as T;

export type Seed = { datasetId: string; itemIds: string[]; runA: string; runB: string };

export async function seed(app: Hono): Promise<Seed> {
  const ds = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'copper', name: `golden-${uuid7()}` }));
  const itemIds = [uuid7(), uuid7(), uuid7()];
  await send(app, 'PUT', `/api/datasets/${ds.id}/items`, {
    items: itemIds.map((id, i) => ({ id, input: { transcript: `set ${i}` }, expected: { exercise: 'bench' } })),
  });
  const runA = await json<{ id: string }>(await send(app, 'POST', '/api/runs', { dataset_id: ds.id, name: 'rules-v1' }));
  const runB = await json<{ id: string }>(await send(app, 'POST', '/api/runs', { dataset_id: ds.id, name: 'rules-v2' }));
  const trace = (run: string, item: string, value: number, output: string) => ({
    id: uuid7(),
    project: 'copper',
    run_id: run,
    dataset_item_id: item,
    input: { transcript: 'x' },
    output: { exercise: output },
    start: '2026-09-13T10:00:00.000Z',
    end: '2026-09-13T10:00:01.000Z',
    metrics: { prompt_tokens: 10, completion_tokens: 5 },
    scores: [{ name: 'exercise_match', value, source: 'sdk' }],
  });
  await send(app, 'POST', '/api/traces/batch', {
    traces: [trace(runA.id, itemIds[0] ?? '', 1, 'bench'), trace(runA.id, itemIds[1] ?? '', 0, 'squat'), trace(runA.id, itemIds[2] ?? '', 1, 'bench')],
  });
  await send(app, 'POST', '/api/traces/batch', {
    traces: [trace(runB.id, itemIds[0] ?? '', 1, 'bench'), trace(runB.id, itemIds[1] ?? '', 1, 'bench'), trace(runB.id, itemIds[2] ?? '', 0, 'row')],
  });
  return { datasetId: ds.id, itemIds, runA: runA.id, runB: runB.id };
}

export type PageSeed = Seed & { a: string[]; b: string[] };

export function pageApp(): { app: Hono; repos: Repos } {
  const db = openDatabase(':memory:');
  const repos = createRepos(db);
  const app = new Hono();
  app.route('/', createPages(repos));
  app.route('/', createApp(db));
  return { app, repos };
}

export const page = async (app: Hono, path: string): Promise<[number, string]> => {
  const res = await app.request(path);
  return [res.status, await res.text()];
};

export async function seedPages(app: Hono): Promise<PageSeed> {
  const s = await seed(app);
  const byRun = async (run: string) => (await json<{ traces: Array<{ id: string }> }>(await send(app, 'GET', `/api/traces?run_id=${run}`))).traces.map((t) => t.id).sort();
  const a = await byRun(s.runA);
  const b = await byRun(s.runB);
  await send(app, 'PUT', `/api/traces/${b[2]}/scores`, { scores: [{ name: 'exercise_match', source: 'human', verdict: 'fail', note: 'wrong lift' }] });
  return { ...s, a, b };
}
