import { describe, expect, test } from 'bun:test';
import { toWhere } from '../src/services/filters.ts';
import { guardSelect } from '../src/services/query.ts';
import { rollup } from '../src/services/rollup.ts';
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
