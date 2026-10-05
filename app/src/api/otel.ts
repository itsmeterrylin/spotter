import { Hono } from 'hono';
import { z } from 'zod';
import type { Repos } from '../db/repos/index.ts';
import { unsupportedMedia } from '../errors.ts';
import { ingestOtlp } from '../services/otlp.ts';
import { attributes, type SpanWithResource } from '../services/otlpMap.ts';

const nano = z.union([z.string().regex(/^\d+$/), z.number().nonnegative()]);
const keyValue = z.object({ key: z.string(), value: z.unknown() });

const span = z.object({
  traceId: z.string().min(1).max(128),
  spanId: z.string().min(1),
  parentSpanId: z.string().optional(),
  name: z.string(),
  startTimeUnixNano: nano,
  endTimeUnixNano: nano.optional(),
  attributes: z.array(keyValue).optional(),
  events: z.array(z.object({ timeUnixNano: nano, name: z.string(), attributes: z.array(keyValue).optional() })).optional(),
});

export const otlpTraces = z.object({
  resourceSpans: z
    .array(
      z.object({
        resource: z.object({ attributes: z.array(keyValue).optional() }).optional(),
        scopeSpans: z.array(z.object({ spans: z.array(span).optional() })).optional(),
      }),
    )
    .optional(),
});

export const flatten = (body: z.infer<typeof otlpTraces>): SpanWithResource[] =>
  (body.resourceSpans ?? []).flatMap((rs) => {
    const resource = attributes(rs.resource?.attributes);
    return (rs.scopeSpans ?? []).flatMap((ss) => (ss.spans ?? []).map((s) => ({ span: s, resource })));
  });

export const otelApi = (repos: Repos) => {
  const api = new Hono();

  api.post('/v1/traces', async (c) => {
    const type = c.req.header('content-type') ?? '';
    if (type.includes('protobuf')) throw unsupportedMedia('OTLP/HTTP protobuf is not supported; send OTLP/HTTP JSON (OTEL_EXPORTER_OTLP_PROTOCOL=http/json)');
    const body = otlpTraces.parse(await c.req.json());
    return c.json(ingestOtlp(repos, flatten(body)));
  });

  return api;
};
