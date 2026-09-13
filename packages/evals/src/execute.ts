import type { EvalDefinition, EvalItem, Json, ScoreResult } from './index.ts';
import type { ScoreSummary, SummaryView } from './summary.ts';

export type ItemResult = { item: EvalItem; output: Json; scores: ScoreResult[]; start: string; end: string; duration_ms: number };

export const concurrency = 4;

export const toJson = (value: unknown): Json => (value === undefined ? null : (JSON.parse(JSON.stringify(value)) as Json));

async function runOne(def: EvalDefinition, item: EvalItem): Promise<ItemResult> {
  const start = new Date();
  const t0 = performance.now();
  const output = toJson(await def.task(item));
  const duration_ms = Math.round(performance.now() - t0);
  const end = new Date();
  const scores = await Promise.all(def.scores.map((score) => score(item, output)));
  return { item, output, scores, start: start.toISOString(), end: end.toISOString(), duration_ms };
}

export async function executeAll(def: EvalDefinition, items: EvalItem[], onResult?: (r: ItemResult) => Promise<void>): Promise<ItemResult[]> {
  const results: ItemResult[] = new Array<ItemResult>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      const item = items[index];
      if (!item) return;
      const result = await runOne(def, item);
      results[index] = result;
      if (onResult) await onResult(result);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export function localSummary(results: ItemResult[]): SummaryView {
  const sums = new Map<string, { total: number; n: number }>();
  for (const r of results) {
    for (const s of r.scores) {
      const held = sums.get(s.name) ?? { total: 0, n: 0 };
      sums.set(s.name, { total: held.total + s.value, n: held.n + 1 });
    }
  }
  const scores: Record<string, ScoreSummary> = {};
  for (const [name, { total, n }] of sums) scores[name] = { mean: total / n, n, baseline_mean: null, diff: null, improvements: 0, regressions: 0 };
  return { run_id: null, compare_to: null, scores, url: null };
}
