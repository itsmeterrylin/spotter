import { basename, extname, resolve } from 'node:path';
import { isEvalDefinition, type EvalDefinition, type EvalItem, type ItemInput, type Json } from './index.ts';

export type LoadedEval = { def: EvalDefinition; items: EvalItem[] | null; name: string };

const isItemInput = (value: unknown): value is ItemInput => typeof value === 'object' && value !== null && typeof (value as ItemInput).id === 'string';

export const toEvalItem = (it: ItemInput): EvalItem => ({ id: it.id, input: it.input, expected: it.expected ?? null, metadata: it.metadata ?? null });

export async function loadEval(path: string): Promise<LoadedEval> {
  const file = resolve(path);
  const mod = (await import(file)) as { default?: unknown; items?: unknown };
  if (!isEvalDefinition(mod.default)) throw new Error(`${path} must export default defineEval({...})`);
  const items = Array.isArray(mod.items) ? mod.items : null;
  if (items && !items.every(isItemInput)) throw new Error(`${path} exports items, but every item needs a string id`);
  return { def: mod.default, items: items ? items.map(toEvalItem) : null, name: basename(file, extname(file)) };
}

export function gitSha(): string | null {
  try {
    const proc = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], { stdout: 'pipe', stderr: 'pipe' });
    if (proc.exitCode !== 0) return null;
    return proc.stdout.toString().trim() || null;
  } catch {
    return null;
  }
}

export const parseJsonText = (value: unknown): Json | null => (typeof value === 'string' ? (JSON.parse(value) as Json) : null);
