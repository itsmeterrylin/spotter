import { parseMaybeJson } from '../db/json.ts';
import type { Json, JsonObject, Message, Metrics, TraceEvent } from '../db/types.ts';

export type KeyValue = { key: string; value: unknown };
export type OtlpEvent = { timeUnixNano: string | number; name: string; attributes?: KeyValue[] };
export type OtlpSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeUnixNano: string | number;
  endTimeUnixNano?: string | number;
  attributes?: KeyValue[];
  events?: OtlpEvent[];
};
export type SpanWithResource = { span: OtlpSpan; resource: JsonObject };

export type Span = { span_id: string; parent_id: string | null; name: string; start: string; end: string | null; attributes: JsonObject };
export type MappedTrace = {
  id: string;
  project: string;
  run_id: string | null;
  dataset_item_id: string | null;
  input: Json | undefined;
  output: Json | undefined;
  messages: Message[] | null;
  metrics: Metrics | null;
  attributes: JsonObject;
  events: TraceEvent[];
  spans: Span[];
  start: string;
  end: string | null;
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isJsonObject = (v: Json): v is JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v);

export function anyValue(v: unknown): Json {
  if (!isObject(v)) return null;
  if (typeof v.stringValue === 'string') return v.stringValue;
  if (typeof v.boolValue === 'boolean') return v.boolValue;
  if (v.intValue !== undefined) return Number(v.intValue);
  if (typeof v.doubleValue === 'number') return v.doubleValue;
  if (isObject(v.arrayValue) && Array.isArray(v.arrayValue.values)) return v.arrayValue.values.map(anyValue);
  if (isObject(v.kvlistValue) && Array.isArray(v.kvlistValue.values)) return attributes(v.kvlistValue.values as KeyValue[]);
  if (typeof v.bytesValue === 'string') return v.bytesValue;
  return null;
}

export const attributes = (list: KeyValue[] | undefined): JsonObject => Object.fromEntries((list ?? []).map((kv) => [kv.key, anyValue(kv.value)]));

export const nanoToIso = (ns: string | number): string => new Date(Number(BigInt(typeof ns === 'number' ? Math.trunc(ns) : ns) / 1000000n)).toISOString();


const partText = (p: Json): string | null => {
  if (!isJsonObject(p)) return null;
  if (typeof p.content === 'string') return p.content;
  if (typeof p.text === 'string') return p.text;
  return null;
};

const messageContent = (m: JsonObject): Json => {
  if (Array.isArray(m.parts)) return m.parts.map(partText).filter((t): t is string => t !== null).join('\n');
  return m.content ?? null;
};

function toMessages(raw: Json, offset: number): Message[] {
  const list = parseMaybeJson(raw);
  if (!Array.isArray(list)) return [];
  return list.filter(isJsonObject).map((m, i) => ({ turn: offset + i + 1, role: typeof m.role === 'string' ? m.role : 'unknown', content: messageContent(m) }));
}

const num = (v: Json | undefined): number | null => (typeof v === 'number' ? v : typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

const sum = (spans: OtlpSpan[], keys: string[]): number | null => {
  const found = spans.flatMap((s) => keys.map((k) => num(attributes(s.attributes)[k])).filter((n): n is number => n !== null));
  return found.length ? found.reduce((a, b) => a + b, 0) : null;
};

const genAi = ['gen_ai.input.messages', 'gen_ai.output.messages', 'gen_ai.prompt', 'gen_ai.completion'];

const str = (v: Json | undefined): string | null => (typeof v === 'string' && v !== '' ? v : null);

export function mapTrace(id: string, group: SpanWithResource[]): MappedTrace {
  const sorted = [...group].sort((a, b) => nanoToIso(a.span.startTimeUnixNano).localeCompare(nanoToIso(b.span.startTimeUnixNano)));
  const root = sorted.find((s) => !s.span.parentSpanId) ?? sorted[0];
  const rootAttrs = root ? attributes(root.span.attributes) : {};
  const merged: JsonObject = Object.assign({}, root?.resource ?? {}, ...sorted.map((s) => attributes(s.span.attributes)), rootAttrs);
  const content = [root, ...sorted.slice().reverse()].map((s) => (s ? attributes(s.span.attributes) : {})).find((a) => genAi.some((k) => k in a)) ?? {};
  const inputMessages = content['gen_ai.input.messages'] === undefined ? [] : toMessages(content['gen_ai.input.messages'], 0);
  const messages = [...inputMessages, ...(content['gen_ai.output.messages'] === undefined ? [] : toMessages(content['gen_ai.output.messages'], inputMessages.length))];
  const prompt = sum(sorted.map((s) => s.span), ['gen_ai.usage.input_tokens', 'prompt_tokens']);
  const completion = sum(sorted.map((s) => s.span), ['gen_ai.usage.output_tokens', 'completion_tokens']);
  const ends = sorted.map((s) => s.span.endTimeUnixNano).filter((e): e is string | number => e !== undefined).map(nanoToIso);
  return {
    id,
    project: str(merged['spotter.project']) ?? str(merged['service.name']) ?? 'default',
    run_id: str(merged['spotter.run_id']),
    dataset_item_id: str(merged['spotter.dataset_item_id']),
    input: content['gen_ai.prompt'] === undefined ? undefined : parseMaybeJson(content['gen_ai.prompt']),
    output: content['gen_ai.completion'] === undefined ? undefined : parseMaybeJson(content['gen_ai.completion']),
    messages: messages.length ? messages : null,
    metrics: prompt === null && completion === null ? null : { ...(prompt === null ? {} : { prompt_tokens: prompt }), ...(completion === null ? {} : { completion_tokens: completion }) },
    attributes: merged,
    events: sorted
      .flatMap((s) => (s.span.events ?? []).map((e) => ({ at: nanoToIso(e.timeUnixNano), name: e.name, ...(e.attributes?.length ? { data: attributes(e.attributes) } : {}) })))
      .sort((a, b) => a.at.localeCompare(b.at)),
    spans: sorted.map(({ span }) => ({
      span_id: span.spanId,
      parent_id: span.parentSpanId ?? null,
      name: span.name,
      start: nanoToIso(span.startTimeUnixNano),
      end: span.endTimeUnixNano === undefined ? null : nanoToIso(span.endTimeUnixNano),
      attributes: attributes(span.attributes),
    })),
    start: nanoToIso(sorted[0]?.span.startTimeUnixNano ?? 0),
    end: ends.length ? ends.sort().reverse()[0] ?? null : null,
  };
}
