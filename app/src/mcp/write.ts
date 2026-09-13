import type { z } from 'zod';
import { datasetCreate, itemsUpsert, metadataPatch, runCreate, scoresPut, toNewScore, tracesBatch } from '../api/schemas.ts';
import type { Repos } from '../db/repos/index.ts';
import { createDataset, upsertItems } from '../services/datasets.ts';
import { createRun } from '../services/runs.ts';
import { insertBatch, patchMetadata, putScores } from '../services/traces.ts';
import { later, type ToolResult } from './result.ts';
import { id, type WriteArgs, type WriteOp } from './schemas.ts';

type Handler = (repos: Repos, data: unknown, commit: boolean) => ToolResult;

const op =
  <T>(schema: z.ZodType<T>, run: (repos: Repos, input: T) => ToolResult): Handler =>
  (repos, data, commit) => {
    const input = schema.parse(data);
    return commit ? run(repos, input) : {};
  };

const ops: Record<WriteOp, Handler | number> = {
  'dataset.create': op(datasetCreate, (repos, body) => {
    const { dataset, created } = createDataset(repos, body);
    return { ids: [dataset.id], created, dataset, url: dataset.url };
  }),
  'items.upsert': op(itemsUpsert.extend({ dataset_id: id }), (repos, body) => {
    const result = upsertItems(repos, body.dataset_id, body.items);
    return { ids: body.items.map((i) => i.id), upserted: result.upserted, url: result.url };
  }),
  'run.create': op(runCreate, (repos, body) => {
    const { run, created } = createRun(repos, body);
    return { ids: [run.id], created, run, url: run.url };
  }),
  'traces.insert': op(tracesBatch, (repos, body) => {
    const traces = body.traces.map(({ scores, ...t }) => ({ ...t, scores: scores?.map(toNewScore) }));
    return { ids: body.traces.map((t) => t.id), ...insertBatch(repos, traces) };
  }),
  'trace.patch_metadata': op(metadataPatch.extend({ trace_id: id }), (repos, { trace_id, ...patch }) => {
    const trace = patchMetadata(repos, trace_id, patch);
    return { ids: [trace_id], trace, url: trace.url };
  }),
  'scores.put': op(scoresPut.extend({ trace_id: id }), (repos, body) => {
    const trace = putScores(repos, body.trace_id, body.scores.map(toNewScore));
    return { ids: [body.trace_id], scores: trace.scores, url: trace.url };
  }),
  'items.from_traces': 8,
  'judge.propose': 6,
  'judge.activate': 6,
  'alert.create': 9,
  'alert.test': 9,
};

export function write(repos: Repos, args: WriteArgs): ToolResult {
  const handler = ops[args.op];
  if (typeof handler === 'number') return { ok: false, op: args.op, note: later(handler) };
  const result = handler(repos, args.data, !args.dry_run);
  return args.dry_run ? { ok: true, dry_run: true, op: args.op } : { ok: true, op: args.op, ...result };
}
