import { z } from 'zod';
import type { NewScore } from '../db/repos/score.ts';
import { operators } from '../services/filters.ts';

const id = z.string().min(1).max(128);
const jsonObject = z.record(z.string(), z.json());
const isoTime = z.iso.datetime({ offset: true });

export const datasetCreate = z.object({
  id: id.optional(),
  project: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullish(),
  purpose: z.enum(['eval', 'judge_labels']).optional(),
});

export const itemsUpsert = z.object({
  items: z
    .array(
      z.object({
        id,
        input: z.json(),
        expected: z.json().optional(),
        metadata: jsonObject.nullish(),
        tags: z.array(z.string()).nullish(),
        source_trace_id: id.nullish(),
      }),
    )
    .min(1)
    .max(1000),
});

export const runCreate = z.object({ id: id.optional(), dataset_id: id, name: z.string().min(1), metadata: jsonObject.nullish() });

const verdictValue = { pass: 1, fail: 0, defer: 0 } as const;

export const scoreInput = z
  .object({
    name: z.string().min(1),
    value: z.number().optional(),
    verdict: z.enum(['pass', 'fail', 'defer']).optional(),
    label: z.string().nullish(),
    reason: z.string().nullish(),
    note: z.string().nullish(),
    source: z.enum(['sdk', 'judge', 'human']),
    turn: z.number().int().nonnegative().nullish(),
    judge_version_id: id.nullish(),
  })
  .refine((s) => s.value !== undefined || s.verdict !== undefined, { message: 'a score needs value or verdict' });

export type ScoreInput = z.infer<typeof scoreInput>;

export const toNewScore = (s: ScoreInput): NewScore => ({
  name: s.name,
  value: s.value ?? verdictValue[s.verdict ?? 'fail'],
  label: s.label ?? s.verdict ?? null,
  reason: s.reason ?? s.note ?? null,
  source: s.source,
  turn: s.turn ?? null,
  judge_version_id: s.judge_version_id ?? null,
});

export const scoresPut = z.object({ scores: z.array(scoreInput).min(1) });

export const traceEvent = z.object({ at: isoTime, name: z.string().min(1), data: z.json().optional() });

export const traceInput = z.object({
  id,
  project: z.string().min(1),
  run_id: id.nullish(),
  dataset_item_id: id.nullish(),
  input: z.json().optional(),
  output: z.json().optional(),
  expected: z.json().optional(),
  metadata: jsonObject.nullish(),
  tags: z.array(z.string()).nullish(),
  start: isoTime,
  end: isoTime.nullish(),
  metrics: jsonObject.nullish(),
  messages: z.array(z.object({ turn: z.number().int(), role: z.string(), content: z.json(), metadata: jsonObject.optional() })).nullish(),
  events: z.array(traceEvent).nullish(),
  spans: z.json().optional(),
  scores: z.array(scoreInput).optional(),
});

export const tracesBatch = z.object({ traces: z.array(traceInput).min(1).max(500) });

export const metadataPatch = z.object({ metadata: jsonObject.optional(), events: z.array(traceEvent).optional() });

export const filter = z.object({ field: z.string().min(1), key: z.string().optional(), operator: z.enum(operators), value: z.json().optional() });

export const traceListQuery = z.object({
  filters: z
    .string()
    .optional()
    .transform((s, ctx) => {
      if (s === undefined) return [];
      const parsed = z.array(filter).safeParse(JSON.parse(s));
      if (parsed.success) return parsed.data;
      ctx.addIssue({ code: 'custom', message: 'filters must be a JSON array of {field, key?, operator, value?}' });
      return z.NEVER;
    }),
  run_id: id.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  cursor: id.optional(),
});

export const querySql = z.object({ sql: z.string().min(1) });

export const summaryQuery = z.object({ compare_to: id.optional() });

export const compareQuery = z.object({
  runs: z.string().min(1).transform((s) => s.split(',').filter(Boolean)),
  only: z.literal('changes').optional(),
});
