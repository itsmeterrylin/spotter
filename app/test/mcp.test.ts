import { beforeAll, describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import type { Hono } from 'hono';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db/client.ts';
import { mountMcp } from '../src/mcp/index.ts';

type Rpc = { jsonrpc: '2.0'; id: number; result?: Record<string, unknown>; error?: { code: number; message: string } };
type ToolResult = { content: { type: string; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean };

const db = openDatabase(':memory:');
const app: Hono = createApp(db);
mountMcp(app, db);

const session: Record<string, string> = {};
let nextId = 1;

async function rpc(method: string, params: Record<string, unknown>): Promise<{ res: Response; body: Rpc }> {
  const id = nextId++;
  const res = await app.request('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18', ...session },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const parsed = (await res.json()) as Rpc | Rpc[];
  const body = Array.isArray(parsed) ? (parsed[0] as Rpc) : parsed;
  return { res, body };
}

async function call(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { body } = await rpc('tools/call', { name, arguments: args });
  expect(body.error).toBeUndefined();
  const result = body.result as ToolResult;
  expect(result.isError).toBeFalsy();
  const fromText = JSON.parse(result.content[0]?.text ?? '{}') as Record<string, unknown>;
  expect(result.structuredContent).toEqual(fromText);
  return fromText;
}

const traceFor = (run: string, item: string, value: number, output: string) => ({
  id: uuid7(),
  project: 'copper',
  run_id: run,
  dataset_item_id: item,
  input: { transcript: 'x' },
  output: { exercise: output },
  start: '2026-09-13T10:00:00.000Z',
  end: '2026-09-13T10:00:01.000Z',
  scores: [{ name: 'exercise_match', value, source: 'sdk' }],
});

describe('MCP /mcp', () => {
  const itemIds = [uuid7(), uuid7()];
  let datasetId = '';
  let runA = '';
  let runB = '';

  beforeAll(async () => {
    const { res, body } = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
    expect(res.status).toBe(200);
    expect((body.result as { serverInfo: { name: string } }).serverInfo.name).toBe('spotter');
    const sid = res.headers.get('mcp-session-id');
    if (sid) session['mcp-session-id'] = sid;
  });

  test('tools/list exposes the four tools', async () => {
    const { body } = await rpc('tools/list', {});
    const tools = (body.result as { tools: { name: string }[] }).tools.map((t) => t.name).sort();
    expect(tools).toEqual(['compare', 'list', 'read', 'write']);
  });

  test('write creates a dataset, items, runs, and traces, each with url', async () => {
    const ds = await call('write', { op: 'dataset.create', data: { project: 'copper', name: `golden-${uuid7()}` } });
    expect(ds.ok).toBe(true);
    datasetId = (ds.ids as string[])[0] ?? '';
    expect(ds.url).toBe(`http://localhost:3000/datasets/${datasetId}/items`);
    const items = await call('write', { op: 'items.upsert', data: { dataset_id: datasetId, items: itemIds.map((id, i) => ({ id, input: { transcript: `set ${i}` }, expected: { exercise: 'bench' } })) } });
    expect(items).toMatchObject({ ok: true, upserted: 2, ids: itemIds });
    expect(items.url).toContain(datasetId);
    const a = await call('write', { op: 'run.create', data: { dataset_id: datasetId, name: 'rules-v1' } });
    const b = await call('write', { op: 'run.create', data: { dataset_id: datasetId, name: 'rules-v2' } });
    runA = (a.ids as string[])[0] ?? '';
    runB = (b.ids as string[])[0] ?? '';
    expect(a.url).toBe(`http://localhost:3000/runs/${runA}`);
    const inserted = await call('write', {
      op: 'traces.insert',
      data: { traces: [traceFor(runA, itemIds[0] ?? '', 1, 'bench'), traceFor(runA, itemIds[1] ?? '', 0, 'squat'), traceFor(runB, itemIds[0] ?? '', 1, 'bench'), traceFor(runB, itemIds[1] ?? '', 1, 'bench')] },
    });
    expect(inserted).toMatchObject({ ok: true, inserted: 4, skipped: 0 });
    expect(inserted.url).toBe('http://localhost:3000/traces');
    expect(inserted.urls).toHaveLength(4);
  });

  test('read run returns aggregates and url', async () => {
    const run = await call('read', { type: 'run', id: runB });
    expect(run.url).toBe(`http://localhost:3000/runs/${runB}`);
    expect(run.aggregates).toMatchObject({ trace_count: 2, scores: { exercise_match: { mean: 1, n: 2 } } });
  });

  test('list traces filters by run and every row carries url', async () => {
    const page = await call('list', { type: 'traces', run_id: runA });
    const items = page.items as { url: string; run_id: string }[];
    expect(items).toHaveLength(2);
    for (const t of items) expect(t.url).toMatch(/^http:\/\/localhost:3000\/traces\//);
    expect(page.url).toContain(`run_id=${runA}`);
    const runs = await call('list', { type: 'runs', dataset_id: datasetId });
    expect((runs.items as { url: string }[]).map((r) => r.url).sort()).toEqual([`http://localhost:3000/runs/${runA}`, `http://localhost:3000/runs/${runB}`].sort());
  });

  test('compare two runs returns changed items, summary, and url', async () => {
    const cmp = await call('compare', { dataset_id: datasetId, run_ids: [runA, runB], only: 'changes' });
    expect(cmp.url).toBe(`http://localhost:3000/datasets/${datasetId}/compare?runs=${runA}%2C${runB}&only=changes`);
    expect((cmp.items as { item_id: string }[]).map((i) => i.item_id)).toEqual([itemIds[1] ?? '']);
    expect(cmp.summary).toMatchObject({ exercise_match: { diff: 0.5, improvements: 1, regressions: 0 } });
  });

  test('read audit reports counts and url', async () => {
    const audit = await call('read', { type: 'audit' });
    expect(audit).toMatchObject({ runs: 2, traces: 4, human_labels: 0, runs_without_baseline: 2, datasets_without_runs: 0, url: 'http://localhost:3000/' });
    expect(audit.datasets).toBeGreaterThanOrEqual(1);
  });

  test('dry_run validates without writing, and bad data is a tool error', async () => {
    const before = await call('read', { type: 'audit' });
    const dry = await call('write', { op: 'run.create', data: { dataset_id: datasetId, name: 'never' }, dry_run: true });
    expect(dry).toEqual({ ok: true, dry_run: true, op: 'run.create' });
    const after = await call('read', { type: 'audit' });
    expect(after.runs).toBe(before.runs);
    const { body } = await rpc('tools/call', { name: 'write', arguments: { op: 'run.create', data: { name: 'no dataset' } } });
    const result = body.result as ToolResult;
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0]?.text ?? '{}')).toMatchObject({ error: { code: 'invalid' } });
  });

  test('judge.propose, judge.activate, read judge, list judges, list disagreements, and audit judges', async () => {
    const v1 = await call('write', { op: 'judge.propose', data: { judge: 'exercise_match', prompt: 'Is {{output}} right given {{expected}}?', model: 'fake:contains', note: 'draft' } });
    expect(v1).toMatchObject({ ok: true, existing: false, url: 'http://localhost:3000/judges/exercise_match/versions/1' });
    const v2 = await call('write', { op: 'judge.propose', data: { judge: 'exercise_match', from_version: 1, prompt: 'Strict: is {{output}} right given {{expected}}?', note: 'stricter' } });
    expect(v2.url).toBe('http://localhost:3000/judges/exercise_match/versions/2');
    const judge = await call('read', { type: 'judge', id: 'exercise_match' });
    expect(judge).toMatchObject({ active_version: 1, status: 'needs_labels', url: 'http://localhost:3000/judges/exercise_match', disagreements: [] });
    expect((judge.versions as unknown[]).length).toBe(2);
    const traces = (await call('list', { type: 'traces', run_id: runA })).items as { id: string }[];
    const versionId = ((v1.version as { id: string }).id);
    for (const [i, t] of traces.entries()) {
      await call('write', { op: 'scores.put', data: { trace_id: t.id, scores: [{ name: 'exercise_match', value: 1, source: 'judge', judge_version_id: versionId }, { name: 'exercise_match', verdict: i === 0 ? 'pass' : 'fail', source: 'human' }] } });
    }
    const dis = await call('list', { type: 'disagreements', judge: 'exercise_match' });
    expect(dis).toMatchObject({ version: 1, url: 'http://localhost:3000/judges/exercise_match/disagreements?version=1' });
    expect(dis.items).toHaveLength(1);
    const judges = await call('list', { type: 'judges' });
    expect((judges.items as { name: string; disagreements: number; labels: number }[])[0]).toMatchObject({ name: 'exercise_match', disagreements: 1, labels: 2 });
    const activated = await call('write', { op: 'judge.activate', data: { judge: 'exercise_match', version: 2 } });
    expect(activated).toMatchObject({ ok: true, active_version: 2 });
    const audit = await call('read', { type: 'audit' });
    expect((audit.judges as unknown[])[0]).toMatchObject({ name: 'exercise_match', active_version: 2, status: 'needs_labels', labels: 2, labels_needed: 98, disagreements: 0 });
  });

  test('judge.calibrate stores the splits and reports rates for the version', async () => {
    const cal = await call('write', { op: 'judge.calibrate', data: { judge: 'exercise_match', version: 1 } });
    expect(cal).toMatchObject({ ok: true, judge: 'exercise_match', version: 1, dataset_id: null, url: 'http://localhost:3000/judges/exercise_match/versions/1' });
    const { dev, test: held, examples } = cal as { dev: { n: number }; test: { n: number }; examples: number };
    expect(dev.n + held.n + examples).toBe(2);
    expect(cal.scored).toBe(2);
    const judge = await call('read', { type: 'judge', id: 'exercise_match' });
    const v1 = (judge.versions as { number: number; calibration: unknown[] }[]).find((v) => v.number === 1);
    expect(v1?.calibration.length).toBe([dev.n, held.n].filter(Boolean).length);
  });

  test('placeholders name their phase', async () => {
    expect(await call('list', { type: 'alerts' })).toEqual({ items: [], note: 'available after phase 9' });
    expect(await call('write', { op: 'alert.test', data: {} })).toEqual({ ok: false, op: 'alert.test', note: 'available after phase 9' });
  });
});
