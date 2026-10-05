import { describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db/client.ts';
import { mountMcp } from '../src/mcp/index.ts';
import { json, send } from './helpers.ts';

const db = openDatabase(':memory:');
const app = createApp(db);
mountMcp(app, db);

type FromTraces = { ok?: boolean; ids: string[]; added: number; url: string };
type Item = { id: string; input: unknown; expected: unknown; tags: string[] | null; source_trace_id: string | null };

async function mcpWrite(data: Record<string, unknown>): Promise<{ isError?: boolean; structuredContent: FromTraces }> {
  const res = await app.request('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'write', arguments: { op: 'items.from_traces', data } } }),
  });
  return ((await res.json()) as { result: { isError?: boolean; structuredContent: FromTraces } }).result;
}

const trace = (id: string, input: unknown, expected: unknown) => ({ id, project: 'copper', input, expected, start: '2026-09-13T10:00:00.000Z' });

describe('items.from_traces', () => {
  const [t1, t2, t3] = [uuid7(), uuid7(), uuid7()];

  test('copies input and expected, sets source_trace_id, and is idempotent', async () => {
    await send(app, 'POST', '/api/traces/batch', { traces: [trace(t1, { q: 1 }, { a: 1 }), trace(t2, { q: 2 }, null), trace(t3, { q: 3 }, { a: 3 })] });
    const ds = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'copper', name: 'replay' }));

    const first = await mcpWrite({ dataset_id: ds.id, trace_ids: [t1, t2, t1], tags: ['replay'] });
    expect(first.structuredContent.added).toBe(2);
    expect(first.structuredContent.ids).toHaveLength(2);
    expect(first.structuredContent.url).toEndWith(`/datasets/${ds.id}/items`);

    const again = await mcpWrite({ dataset_id: ds.id, trace_ids: [t1, t2] });
    expect(again.structuredContent.added).toBe(0);
    expect(again.structuredContent.ids).toEqual(first.structuredContent.ids);

    const items = (await json<{ items: Item[] }>(await send(app, 'GET', `/api/datasets/${ds.id}/items`))).items;
    expect(items).toHaveLength(2);
    const byTrace = Object.fromEntries(items.map((i) => [i.source_trace_id, i]));
    expect(byTrace[t1]).toMatchObject({ input: { q: 1 }, expected: { a: 1 }, tags: ['replay'] });
    expect(byTrace[t2]).toMatchObject({ input: { q: 2 }, expected: null });
  });

  test('issue_id takes every trace in the issue, and the REST route and dataset_name+project work', async () => {
    const issue = await json<{ id: string }>(
      await send(app, 'POST', '/api/issues', { project: 'copper', title: 'wrong lift', created_by: 'agent', traces: [{ trace_id: t2 }, { trace_id: t3 }] }),
    );
    const viaName = await mcpWrite({ dataset_name: 'from-issue', project: 'copper', issue_id: issue.id });
    expect(viaName.structuredContent.added).toBe(2);

    const ds = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'copper', name: 'rest' }));
    const rest = await json<FromTraces>(await send(app, 'POST', `/api/datasets/${ds.id}/items/from-traces`, { issue_id: issue.id }));
    expect(rest.added).toBe(2);
    expect((await json<FromTraces>(await send(app, 'POST', `/api/datasets/${ds.id}/items/from-traces`, { issue_id: issue.id }))).added).toBe(0);
  });

  test('rejects an unknown trace and a missing target', async () => {
    const ds = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'copper', name: 'errs' }));
    expect((await mcpWrite({ dataset_id: ds.id, trace_ids: ['nope'] })).isError).toBe(true);
    expect((await mcpWrite({ trace_ids: [t1] })).isError).toBe(true);
    expect((await send(app, 'POST', `/api/datasets/${ds.id}/items/from-traces`, {})).status).toBe(400);
  });
});
