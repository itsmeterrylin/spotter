import { describe, expect, test } from 'bun:test';
import { formatSummary, formatTable, summaryRows, type SummaryView } from '../src/summary.ts';

const summary: SummaryView = {
  run_id: 'b',
  compare_to: 'a',
  scores: {
    weight_found: { mean: 1, n: 12, baseline_mean: 1, diff: 0, improvements: 0, regressions: 0 },
    exercise_match: { mean: 10 / 12, n: 12, baseline_mean: 11 / 12, diff: -1 / 12, improvements: 1, regressions: 2 },
  },
  url: 'http://localhost:3000/datasets/d/compare?runs=a%2Cb&only=changes',
};

describe('summary table', () => {
  test('sorts scores by name and aligns columns', () => {
    const lines = formatTable(summaryRows(summary)).split('\n');
    expect(lines[0]).toBe('score            mean    diff  improvements  regressions');
    expect(lines[1]).toBe('exercise_match  0.833  -0.083             1            2');
    expect(lines[2]).toBe('weight_found    1.000  +0.000             0            0');
    expect(new Set(lines.map((l) => l.length)).size).toBe(1);
  });

  test('prints a dash when there is no baseline', () => {
    const rows = summaryRows({ ...summary, scores: { only: { mean: 0.5, n: 2, baseline_mean: null, diff: null, improvements: 0, regressions: 0 } } });
    expect(rows[0]).toEqual(['only', '0.500', '-', '0', '0']);
  });

  test('appends the run url, the compare url, or the reason there is none', () => {
    const withUrls = formatSummary(summary, { run_url: 'http://localhost:3000/runs/b', compare_url: summary.url, compare_note: null });
    expect(withUrls.split('\n').slice(-2)).toEqual(['run      http://localhost:3000/runs/b', `compare  ${summary.url}`]);
    const noCompare = formatSummary(summary, { run_url: 'http://localhost:3000/runs/b', compare_url: null, compare_note: 'no previous run' });
    expect(noCompare.endsWith('compare  no previous run')).toBe(true);
  });
});
