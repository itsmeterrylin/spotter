import { describe, expect, test } from 'bun:test';
import { bootstrap, bucketOf, correct, rates } from '../src/services/calibration.ts';
import { toWhere } from '../src/services/filters.ts';
import { guardSelect } from '../src/services/query.ts';
import { rollup } from '../src/services/rollup.ts';
import type { LabelPair } from '../src/db/repos/judge.ts';
import type { Score } from '../src/db/repos/score.ts';

describe('filters', () => {
  test('builds parameterized SQL for each field kind', () => {
    const w = toWhere(
      [
        { field: 'metadata', key: 'model', operator: '=', value: 'gpt' },
        { field: 'events.name', operator: '=', value: 'transfer_initiated' },
        { field: 'start', operator: '>=', value: '2026-09-01' },
        { field: 'run_id', operator: 'in', value: ['a', 'b'] },
        { field: 'tags', operator: 'is_empty' },
      ],
      'r1',
    );
    expect(w.where).toContain("json_extract(trace.metadata, ?) = ?");
    expect(w.where).toContain('json_each(trace.events)');
    expect(w.where).toContain('trace."run_id" IN (?, ?)');
    expect(w.params).toEqual(['$.model', 'gpt', '$.name', 'transfer_initiated', '2026-09-01', 'a', 'b', 'r1']);
  });

  test('rejects keys that are not plain', () => {
    expect(() => toWhere([{ field: 'metadata', key: "a') OR 1=1 --", operator: '=', value: 1 }])).toThrow();
  });
});

describe('query guard', () => {
  test('accepts a select with a trailing semicolon and rejects the rest', () => {
    expect(guardSelect(' select 1; ')).toBe('select 1');
    expect(() => guardSelect('pragma table_info(run)')).toThrow();
    expect(() => guardSelect('select 1 /* hi */')).toThrow();
    expect(() => guardSelect('')).toThrow();
  });
});

describe('rollup', () => {
  const base = { id: '', trace_id: 't', label: null, reason: null, judge_version_id: null, created_at: '' };
  test('trace-level value wins, otherwise the mean of turns; human beats sdk', () => {
    const scores: Score[] = [
      { ...base, name: 'tone', turn: 1, value: 1, source: 'sdk' },
      { ...base, name: 'tone', turn: 3, value: 0, source: 'sdk' },
      { ...base, name: 'match', turn: null, value: 0, source: 'sdk' },
      { ...base, name: 'match', turn: null, value: 1, source: 'human' },
    ];
    const r = rollup(scores);
    expect(r.get('tone')).toBe(0.5);
    expect(r.get('match')).toBe(1);
  });
});

describe('calibration', () => {
  const pair = (i: number, human: number, judge: number): LabelPair => ({ trace_id: `t-${i}`, name: 'match', turn: null, human, judge, human_note: null, judge_reason: null });
  const synthetic = (): LabelPair[] => [
    ...Array.from({ length: 45 }, (_, i) => pair(i, 1, 1)),
    ...Array.from({ length: 5 }, (_, i) => pair(45 + i, 1, 0)),
    ...Array.from({ length: 40 }, (_, i) => pair(50 + i, 0, 0)),
    ...Array.from({ length: 10 }, (_, i) => pair(90 + i, 0, 1)),
  ];

  test('rates are exact on known pairs and 0 when a class is missing', () => {
    expect(rates(synthetic())).toEqual({ tpr: 0.9, tnr: 0.8, n: 100 });
    expect(rates([pair(0, 1, 1), pair(1, 1, 1)])).toEqual({ tpr: 1, tnr: 0, n: 2 });
    expect(rates([])).toEqual({ tpr: 0, tnr: 0, n: 0 });
  });

  test('the corrected rate undoes judge bias and is null at or below chance', () => {
    expect(correct(0.6, 0.9, 0.8)).toBeCloseTo((0.6 + 0.8 - 1) / (0.9 + 0.8 - 1), 10);
    expect(correct(0.6, 0.5, 0.5)).toBeNull();
    expect(correct(1, 1, 1)).toBe(1);
    expect(correct(0.05, 0.9, 0.8)).toBe(0);
  });

  test('the bootstrap interval brackets the corrected rate and repeats exactly', () => {
    const values = [...Array.from({ length: 60 }, () => 1), ...Array.from({ length: 40 }, () => 0)];
    const ci = bootstrap(synthetic(), values);
    expect(ci).not.toBeNull();
    const [lo, hi] = ci ?? [0, 0];
    const point = correct(0.6, 0.9, 0.8) ?? 0;
    expect(lo).toBeLessThan(point);
    expect(hi).toBeGreaterThan(point);
    expect(hi - lo).toBeLessThan(0.5);
    expect(bootstrap(synthetic(), values)).toEqual(ci);
    expect(bootstrap([], values)).toBeNull();
  });

  test('bucketOf is stable and fills all three buckets in roughly 15/45/40', () => {
    const ids = Array.from({ length: 2000 }, (_, i) => `trace-${i}`);
    const share = (bucket: string): number => ids.filter((id) => bucketOf(id) === bucket).length / ids.length;
    expect(share('examples')).toBeGreaterThan(0.1);
    expect(share('examples')).toBeLessThan(0.2);
    expect(share('dev')).toBeGreaterThan(0.4);
    expect(share('test')).toBeGreaterThan(0.35);
    expect(bucketOf('cal-01')).toBe('test');
    expect(bucketOf('cal-03')).toBe('examples');
    expect(bucketOf('cal-00')).toBe('dev');
  });
});
