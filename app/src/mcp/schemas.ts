import { z } from 'zod';
import { filter } from '../api/schemas.ts';

export const id = z.string().min(1).max(128);

export const listTypes = ['datasets', 'items', 'runs', 'traces', 'notes', 'judges', 'disagreements', 'alerts', 'deliveries'] as const;
export const readTypes = ['run', 'trace', 'dataset', 'judge', 'audit', 'attribute_map'] as const;
export const writeOps = [
  'dataset.create',
  'items.upsert',
  'run.create',
  'traces.insert',
  'trace.patch_metadata',
  'scores.put',
  'items.from_traces',
  'judge.propose',
  'judge.activate',
  'judge.calibrate',
  'attribute_map.set',
  'alert.create',
  'alert.test',
] as const;

export type WriteOp = (typeof writeOps)[number];

export const listArgs = {
  type: z.enum(listTypes),
  filters: z.array(filter).optional(),
  dataset_id: id.optional(),
  run_id: id.optional(),
  judge: z.string().optional(),
  version: z.number().int().optional(),
  limit: z.number().int().min(1).max(500).default(50),
};

export const readArgs = { type: z.enum(readTypes), id: id.optional() };

export const writeArgs = { op: z.enum(writeOps), data: z.record(z.string(), z.json()).default({}), dry_run: z.boolean().default(false) };

export const compareArgs = { dataset_id: id, run_ids: z.array(id).min(2).max(10), only: z.literal('changes').optional() };

export type ListArgs = z.infer<ReturnType<typeof z.object<typeof listArgs>>>;
export type ReadArgs = z.infer<ReturnType<typeof z.object<typeof readArgs>>>;
export type WriteArgs = z.infer<ReturnType<typeof z.object<typeof writeArgs>>>;
export type CompareArgs = z.infer<ReturnType<typeof z.object<typeof compareArgs>>>;
