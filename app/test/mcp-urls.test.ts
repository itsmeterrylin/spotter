import { beforeAll, describe, expect, test } from 'bun:test';
import type { Hono } from 'hono';
import { createApp } from '../src/app.ts';
import { config } from '../src/config.ts';
import { openDatabase } from '../src/db/client.ts';
import { mountMcp } from '../src/mcp/index.ts';
import { listTypes, readTypes } from '../src/mcp/schemas.ts';
import { seed, type Seed } from './helpers.ts';

type Obj = Record<string, unknown>;

const db = openDatabase(':memory:');
const app: Hono = createApp(db);
mountMcp(app, db);

async function tool(name: string, args: Obj): Promise<Obj> {
  const res = await app.request('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  });
  const result = ((await res.json()) as { result: { isError?: boolean; structuredContent: Obj; content: { text: string }[] } }).result;
  if (result.isError) throw new Error(`${name} ${JSON.stringify(args)} failed: ${result.content[0]?.text}`);
  return result.structuredContent;
}

const isLink = (v: unknown): boolean => typeof v === 'string' && v.startsWith(config.baseUrl);

const missingUrls = (label: string, result: Obj, nested: string[] = []): string[] => {
  const bad: string[] = [];
  if (!isLink(result.url)) bad.push(`${label}: object has no url`);
  const rowSets = ['items', ...nested];
  for (const key of rowSets) {
    const rows = result[key];
    if (!Array.isArray(rows)) continue;
    rows.forEach((row: Obj, i) => {
      if (!isLink(row.url)) bad.push(`${label}: ${key}[${i}] has no url`);
    });
  }
  return bad;
};

let s: Seed;
let judgeVersions = 0;
let issueId = '';
let traceId = '';

beforeAll(async () => {
  s = await seed(app);
  const traces = (await tool('list', { type: 'traces', run_id: s.runB })).items as Obj[];
  traceId = String(traces[0]?.id);
  await tool('write', { op: 'judge.propose', data: { judge: 'exercise_match', prompt: 'Is {{output}} right given {{expected}}?', model: 'fake:contains', note: 'draft' } });
  judgeVersions = 1;
  await tool('write', { op: 'scores.put', data: { trace_id: traceId, scores: [{ name: 'exercise_match', verdict: 'fail', source: 'human', note: 'wrong lift' }] } });
  const issue = await tool('write', { op: 'issues.upsert', data: { project: 'copper', title: 'Wrong lift', traces: [{ trace_id: traceId, turn: 1 }] } });
  issueId = String(issue.id);
  await tool('write', { op: 'attribute_map.set', data: { project: 'copper', map: [{ source: 'a', target: 'b', type: 'string' }] } });
});

const listArgsFor = (type: (typeof listTypes)[number]): Obj => {
  if (type === 'items') return { dataset_id: s.datasetId };
  if (type === 'disagreements') return { judge: 'exercise_match', version: 1 };
  return {};
};

describe('every MCP list type returns a url on the object and on every row', () => {
  const placeholders = ['alerts', 'deliveries'];
  for (const type of listTypes.filter((t) => !placeholders.includes(t))) {
    test(type, async () => {
      const result = await tool('list', { type, ...listArgsFor(type) });
      expect(missingUrls(`list ${type}`, result)).toEqual([]);
    });
  }

  test('seeded types return rows, so the row check is not vacuous', async () => {
    for (const type of ['datasets', 'runs', 'traces', 'notes', 'judges', 'issues', 'inbox'] as const) {
      const rows = (await tool('list', { type })).items as unknown[];
      expect(rows.length, type).toBeGreaterThan(0);
    }
    expect(((await tool('list', { type: 'items', dataset_id: s.datasetId })).items as unknown[]).length).toBe(3);
  });

  test('alerts and deliveries are placeholders: empty items and a note', async () => {
    for (const type of placeholders) {
      expect(await tool('list', { type })).toEqual({ items: [], note: 'available after phase 9' });
    }
  });
});

describe('every MCP read type returns a url on the object and on its nested rows', () => {
  const nested: Record<string, string[]> = { dataset: ['runs'], judge: ['versions', 'disagreements'], issue: ['occurrence_list'], audit: ['judges', 'notifications'] };
  const argsFor = (type: (typeof readTypes)[number]): Obj => {
    if (type === 'run') return { id: s.runA };
    if (type === 'trace') return { id: traceId };
    if (type === 'dataset') return { id: s.datasetId };
    if (type === 'judge') return { id: 'exercise_match' };
    if (type === 'judge_version') return { id: 'exercise_match', version: judgeVersions };
    if (type === 'issue') return { id: issueId };
    if (type === 'attribute_map') return { id: 'copper' };
    return {};
  };
  for (const type of readTypes) {
    test(type, async () => {
      const result = await tool('read', { type, ...argsFor(type) });
      expect(missingUrls(`read ${type}`, result, nested[type] ?? [])).toEqual([]);
    });
  }
});
