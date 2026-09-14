import { describe, expect, test } from 'bun:test';
import { json, send, testApp } from './helpers.ts';

type Span = { span_id: string; parent_id: string | null; name: string; start: string; end: string | null };
type TraceBody = {
  id: string;
  project_id: string;
  input: unknown;
  output: unknown;
  messages: { turn: number; role: string; content: unknown }[] | null;
  metrics: Record<string, number> | null;
  metadata: { attributes: Record<string, unknown>; transfer_to?: string; transfer_result?: string };
  events: { at: string; name: string; data?: unknown }[];
  spans: Span[];
  start: string;
  end: string | null;
};
type Result = { accepted: number; traces: { id: string; url: string }[]; url: string };

const ns = (iso: string): string => (BigInt(Date.parse(iso)) * 1000000n).toString();
const kv = (key: string, value: Record<string, unknown>) => ({ key, value });
const traceId = '5b8efff798038103d269b633813fc60c';

const inputMessages = JSON.stringify([{ role: 'user', parts: [{ type: 'text', content: 'Weather in Paris?' }] }]);
const outputMessages = JSON.stringify([{ role: 'assistant', parts: [{ type: 'text', content: 'Rainy.' }], finish_reason: 'stop' }]);

const firstBatch = {
  resourceSpans: [
    {
      resource: { attributes: [kv('service.name', { stringValue: 'voice' })] },
      scopeSpans: [
        {
          spans: [
            {
              traceId,
              spanId: 'aaaa',
              name: 'session',
              startTimeUnixNano: ns('2026-09-13T10:00:00.000Z'),
              endTimeUnixNano: ns('2026-09-13T10:00:05.000Z'),
              attributes: [kv('lk.transfer.destination', { stringValue: '+1555' })],
              events: [{ timeUnixNano: ns('2026-09-13T10:00:04.000Z'), name: 'transfer_initiated', attributes: [kv('to', { stringValue: '+1555' })] }],
            },
            {
              traceId,
              spanId: 'bbbb',
              parentSpanId: 'aaaa',
              name: 'chat gpt-x',
              startTimeUnixNano: ns('2026-09-13T10:00:01.000Z'),
              endTimeUnixNano: ns('2026-09-13T10:00:03.000Z'),
              attributes: [
                kv('gen_ai.input.messages', { stringValue: inputMessages }),
                kv('gen_ai.output.messages', { stringValue: outputMessages }),
                kv('gen_ai.usage.input_tokens', { intValue: '12' }),
                kv('gen_ai.usage.output_tokens', { intValue: 5 }),
              ],
            },
          ],
        },
      ],
    },
  ],
};

const secondBatch = {
  resourceSpans: [
    {
      resource: { attributes: [kv('service.name', { stringValue: 'voice' })] },
      scopeSpans: [
        {
          spans: [
            {
              traceId,
              spanId: 'cccc',
              parentSpanId: 'aaaa',
              name: 'transfer',
              startTimeUnixNano: ns('2026-09-13T10:00:05.000Z'),
              endTimeUnixNano: ns('2026-09-13T10:00:09.000Z'),
              attributes: [kv('lk.transfer.result', { stringValue: 'completed' }), kv('prompt_tokens', { intValue: 3 })],
              events: [{ timeUnixNano: ns('2026-09-13T10:00:09.000Z'), name: 'transfer_completed' }],
            },
          ],
        },
      ],
    },
  ],
};

describe('POST /api/otel/v1/traces', () => {
  const app = testApp();

  test('one OTLP body with two spans and an event becomes one trace with messages, metrics, raw attributes, events, spans, and a promoted key', async () => {
    await send(app, 'PUT', '/api/projects/voice/attribute-map', [
      { source: 'lk.transfer.destination', target: 'transfer_to', type: 'string' },
      { source: 'lk.transfer.result', target: 'transfer_result', type: 'string' },
    ]);
    const res = await send(app, 'POST', '/api/otel/v1/traces', firstBatch);
    expect(res.status).toBe(200);
    const body = await json<Result>(res);
    expect(body).toEqual({ accepted: 1, traces: [{ id: traceId, url: `http://localhost:3000/traces/${traceId}` }], url: 'http://localhost:3000/traces' });
    const t = await json<TraceBody>(await send(app, 'GET', `/api/traces/${traceId}`));
    const project = await json<{ project_id: string }>(await send(app, 'GET', '/api/projects/voice/attribute-map'));
    expect(t.project_id).toBe(project.project_id);
    expect(t.messages).toEqual([
      { turn: 1, role: 'user', content: 'Weather in Paris?' },
      { turn: 2, role: 'assistant', content: 'Rainy.' },
    ]);
    expect(t.input).toBe('Weather in Paris?');
    expect(t.output).toBe('Rainy.');
    expect(t.metrics).toEqual({ prompt_tokens: 12, completion_tokens: 5 });
    expect(t.metadata.attributes['lk.transfer.destination']).toBe('+1555');
    expect(t.metadata.attributes['service.name']).toBe('voice');
    expect(t.metadata.attributes['gen_ai.usage.input_tokens']).toBe(12);
    expect(t.metadata.transfer_to).toBe('+1555');
    expect(t.events).toEqual([{ at: '2026-09-13T10:00:04.000Z', name: 'transfer_initiated', data: { to: '+1555' } }]);
    expect(t.spans.map((s) => [s.span_id, s.parent_id, s.name])).toEqual([['aaaa', null, 'session'], ['bbbb', 'aaaa', 'chat gpt-x']]);
    expect(t.start).toBe('2026-09-13T10:00:00.000Z');
    expect(t.end).toBe('2026-09-13T10:00:05.000Z');
  });

  test('a second batch merges by trace id: attributes, events, spans, tokens, end, and promotion', async () => {
    const body = await json<Result>(await send(app, 'POST', '/api/otel/v1/traces', secondBatch));
    expect(body.accepted).toBe(1);
    const t = await json<TraceBody>(await send(app, 'GET', `/api/traces/${traceId}`));
    expect(t.spans.map((s) => s.span_id)).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(t.events.map((e) => e.name)).toEqual(['transfer_initiated', 'transfer_completed']);
    expect(t.metadata.attributes['lk.transfer.destination']).toBe('+1555');
    expect(t.metadata.attributes['lk.transfer.result']).toBe('completed');
    expect(t.metadata.transfer_result).toBe('completed');
    expect(t.metrics).toEqual({ prompt_tokens: 15, completion_tokens: 5 });
    expect(t.end).toBe('2026-09-13T10:00:09.000Z');
    expect(t.messages).toHaveLength(2);
  });

  test('no service name falls back to the default project; gen_ai.prompt and completion fill input and output', async () => {
    const body = {
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: [
                {
                  traceId: 'plain-trace',
                  spanId: 'dddd',
                  name: 'llm',
                  startTimeUnixNano: ns('2026-09-13T11:00:00.000Z'),
                  attributes: [kv('gen_ai.prompt', { stringValue: 'log bench' }), kv('gen_ai.completion', { stringValue: '{"exercise":"bench"}' }), kv('prompt_tokens', { intValue: 7 })],
                },
              ],
            },
          ],
        },
      ],
    };
    expect((await send(app, 'POST', '/api/otel/v1/traces', body)).status).toBe(200);
    const t = await json<TraceBody>(await send(app, 'GET', '/api/traces/plain-trace'));
    const project = await json<{ project_id: string }>(await send(app, 'GET', '/api/projects/default/attribute-map'));
    expect(t.project_id).toBe(project.project_id);
    expect(t.input).toBe('log bench');
    expect(t.output).toEqual({ exercise: 'bench' });
    expect(t.messages).toBeNull();
    expect(t.metrics).toEqual({ prompt_tokens: 7 });
    expect(t.end).toBeNull();
    expect(await json<Result>(await send(app, 'POST', '/api/otel/v1/traces', {}))).toMatchObject({ accepted: 0, traces: [] });
  });

  test('a protobuf body answers 415 and names JSON; a malformed body answers 400', async () => {
    const res = await app.request('/api/otel/v1/traces', { method: 'POST', headers: { 'content-type': 'application/x-protobuf' }, body: new Uint8Array([10, 0]) });
    expect(res.status).toBe(415);
    const body = await json<{ error: { code: string; message: string } }>(res);
    expect(body.error.code).toBe('unsupported_media_type');
    expect(body.error.message).toContain('JSON');
    expect((await send(app, 'POST', '/api/otel/v1/traces', { resourceSpans: [{ scopeSpans: [{ spans: [{ spanId: 'x' }] }] }] })).status).toBe(400);
  });
});
