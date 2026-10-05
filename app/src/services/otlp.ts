import type { Repos } from '../db/repos/index.ts';
import type { Trace, TracePatch } from '../db/repos/trace.ts';
import type { Json, JsonObject, Metrics } from '../db/types.ts';
import { urls } from '../urls.ts';
import { promote } from './attributeMap.ts';
import { mapTrace, type MappedTrace, type Span, type SpanWithResource } from './otlpMap.ts';
import { deepMerge, insertBatch } from './traces.ts';

export type OtlpResult = { accepted: number; traces: { id: string; url: string }[]; url: string };

const isSpanList = (v: Json | null): v is Json[] => Array.isArray(v);

const addTokens = (held: Metrics | null, fresh: Metrics | null): Metrics | null => {
  if (!fresh) return held;
  const out: Metrics = { ...(held ?? {}) };
  for (const key of ['prompt_tokens', 'completion_tokens'] as const) {
    const add = fresh[key];
    if (typeof add === 'number') out[key] = (typeof out[key] === 'number' ? out[key] : 0) + add;
  }
  return out;
};

function mergeInto(repos: Repos, held: Trace, t: MappedTrace): void {
  const metadata = promote(repos.attributeMaps.list(held.project_id), deepMerge(held.metadata ?? {}, { attributes: t.attributes }), [...(held.events ?? []), ...t.events]);
  const spans: Span[] = t.spans;
  const patch: TracePatch = {
    metadata,
    events: [...(held.events ?? []), ...t.events],
    spans: [...(isSpanList(held.spans) ? held.spans : []), ...spans],
    metrics: addTokens(held.metrics, t.metrics),
    end: [held.end, t.end].filter((e): e is string => e !== null).sort().reverse()[0] ?? null,
  };
  if (held.messages === null && t.messages) patch.messages = t.messages;
  if (held.input === null && t.input !== undefined) patch.input = t.input;
  if (held.output === null && t.output !== undefined) patch.output = t.output;
  repos.traces.merge(held.id, patch);
}

export function ingestOtlp(repos: Repos, spans: SpanWithResource[]): OtlpResult {
  const groups = new Map<string, SpanWithResource[]>();
  for (const s of spans) groups.set(s.span.traceId, [...(groups.get(s.span.traceId) ?? []), s]);
  const mapped = [...groups].map(([id, group]) => mapTrace(id, group));
  const fresh = mapped.filter((t) => !repos.traces.get(t.id));
  if (fresh.length) {
    insertBatch(
      repos,
      fresh.map(({ attributes, ...t }) => {
        const metadata: JsonObject = { attributes };
        return { ...t, metadata };
      }),
    );
  }
  for (const t of mapped) {
    const held = fresh.includes(t) ? null : repos.traces.get(t.id);
    if (held) mergeInto(repos, held, t);
  }
  return { accepted: mapped.length, traces: mapped.map((t) => ({ id: t.id, url: urls.trace(t.id) })), url: urls.traces() };
}
