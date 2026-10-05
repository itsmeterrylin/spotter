import { describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import { json, send, testApp } from './helpers.ts';

type MapView = { project_id: string; project: string; map: { source: string; target: string; type: string }[]; url: string };
type TraceBody = { id: string; metadata: Record<string, unknown> | null; events: { name: string }[] | null };

const map = [
  { source: 'lk.transfer.destination', target: 'transfer_to', type: 'string' },
  { source: 'gen_ai.usage.total_tokens', target: 'tokens', type: 'number' },
  { source: 'transfer_initiated', target: 'transferred', type: 'boolean' },
  { source: 'transfer_initiated', target: 'x', type: 'string' },
];

const at = '2026-09-13T10:00:00.000Z';
const trace = (over: Record<string, unknown> = {}) => ({ id: uuid7(), project: 'voice', input: 'q', output: 'a', start: at, ...over });

describe('attribute map', () => {
  const app = testApp();

  test('PUT by project name creates the project; GET works by id and name; validation and unknown project fail', async () => {
    expect((await send(app, 'PUT', '/api/projects/voice/attribute-map', map)).status).toBe(400);
    const res = await send(app, 'PUT', '/api/projects/voice/attribute-map', map.slice(0, 3));
    expect(res.status).toBe(200);
    const body = await json<MapView>(res);
    expect(body.project).toBe('voice');
    expect(body.map.map((m) => m.target)).toEqual(['tokens', 'transfer_to', 'transferred']);
    expect(body.url).toBe('http://localhost:3000/traces');
    expect(await json<MapView>(await send(app, 'GET', `/api/projects/${body.project_id}/attribute-map`))).toEqual(body);
    expect(await json<MapView>(await send(app, 'GET', '/api/projects/voice/attribute-map'))).toEqual(body);
    expect((await send(app, 'GET', '/api/projects/nope/attribute-map')).status).toBe(404);
    expect((await send(app, 'PUT', '/api/projects/voice/attribute-map', [{ source: 'a', target: 'bad.key', type: 'string' }])).status).toBe(400);
    expect((await send(app, 'PUT', '/api/projects/voice/attribute-map', [{ source: 'a', target: 'ok', type: 'date' }])).status).toBe(400);
  });

  test('insert promotes attributes and events to typed metadata keys and keeps the raw values', async () => {
    const t = trace({ metadata: { attributes: { 'lk.transfer.destination': '+1555', 'gen_ai.usage.total_tokens': '42' } }, events: [{ at, name: 'transfer_initiated', data: { to: '+1555' } }] });
    await send(app, 'POST', '/api/traces/batch', { traces: [t] });
    const got = await json<TraceBody>(await send(app, 'GET', `/api/traces/${t.id}`));
    expect(got.metadata).toEqual({ attributes: { 'lk.transfer.destination': '+1555', 'gen_ai.usage.total_tokens': '42' }, transfer_to: '+1555', tokens: 42, transferred: true });
  });

  test('a metadata patch promotes late attributes and events', async () => {
    const t = trace({ metadata: { attributes: { 'gen_ai.usage.total_tokens': 'n/a' } } });
    await send(app, 'POST', '/api/traces/batch', { traces: [t] });
    const before = await json<TraceBody>(await send(app, 'GET', `/api/traces/${t.id}`));
    expect(before.metadata).toEqual({ attributes: { 'gen_ai.usage.total_tokens': 'n/a' } });
    await send(app, 'PATCH', `/api/traces/${t.id}/metadata`, { metadata: { attributes: { 'lk.transfer.destination': '+1777' } } });
    const patched = await json<TraceBody>(await send(app, 'PATCH', `/api/traces/${t.id}/metadata`, { events: [{ at, name: 'transfer_initiated' }] }));
    expect(patched.metadata).toMatchObject({ transfer_to: '+1777', transferred: true });
    expect(patched.metadata?.tokens).toBeUndefined();
  });

  test('traces filter by the promoted key and by event name', async () => {
    const plain = trace();
    await send(app, 'POST', '/api/traces/batch', { traces: [plain] });
    const byKey = await json<{ traces: TraceBody[] }>(await send(app, 'GET', `/api/traces?filters=${encodeURIComponent(JSON.stringify([{ field: 'metadata.transfer_to', operator: '=', value: '+1555' }]))}`));
    expect(byKey.traces).toHaveLength(1);
    expect(byKey.traces[0]?.metadata?.transfer_to).toBe('+1555');
    const byEvent = await json<{ traces: TraceBody[] }>(await send(app, 'GET', `/api/traces?filters=${encodeURIComponent(JSON.stringify([{ field: 'events', key: 'name', operator: '=', value: 'transfer_initiated' }]))}`));
    expect(byEvent.traces).toHaveLength(2);
    expect(byEvent.traces.map((x) => x.id)).not.toContain(plain.id);
    const [status, html] = [(await app.request(`/traces/${byEvent.traces[0]?.id}`)).status, await (await app.request(`/traces/${byEvent.traces[0]?.id}`)).text()];
    expect(status).toBe(200);
    expect(html).toContain('Events');
    expect(html).toContain('transfer_initiated');
  });
});
