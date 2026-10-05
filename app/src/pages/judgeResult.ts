import type { Score } from '../db/repos/score.ts';

export type JudgeResult = { name: string; verdict: 'pass' | 'fail'; failingTurns: number };

const passed = (s: Score): boolean => s.value >= 0.5;

/** One result per judge that scored the trace: fail if any scored turn failed, pass if all passed. A judge that has not scored the trace has no result. */
export function judgeResults(scores: Score[]): JudgeResult[] {
  const byName = new Map<string, Score[]>();
  for (const s of scores) if (s.source === 'judge' && s.label !== 'defer') byName.set(s.name, [...(byName.get(s.name) ?? []), s]);
  return [...byName]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, list]) => ({
      name,
      verdict: list.every(passed) ? 'pass' : 'fail',
      failingTurns: new Set(list.filter((s) => !passed(s) && s.turn !== null).map((s) => s.turn)).size,
    }));
}

export const judgeChip = (r: JudgeResult): string => `${r.name} ${r.verdict}${r.failingTurns ? ` · ${r.failingTurns} ${r.failingTurns === 1 ? 'turn' : 'turns'}` : ''}`;
