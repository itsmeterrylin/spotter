import { beforeAll, describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import type { Score } from '../src/db/repos/score.ts';
import { judgeChip, judgeResults } from '../src/pages/judgeResult.ts';
import { json, page, pageApp, send } from './helpers.ts';

const score = (name: string, turn: number | null, value: number, source: Score['source'] = 'judge', label: string | null = null): Score => ({
  id: uuid7(),
  trace_id: 't',
  name,
  turn,
  value,
  label,
  reason: null,
  source,
  judge_version_id: 'v',
  created_at: '2026-10-01T10:00:00.000Z',
});

describe('judge results per trace', () => {
  test('fail if any turn failed, with the failing turn count', () => {
    const results = judgeResults([score('language-leak', 1, 1), score('language-leak', 3, 0), score('language-leak', 5, 0)]);
    expect(results).toEqual([{ name: 'language-leak', verdict: 'fail', failingTurns: 2 }]);
    expect(judgeChip(results[0]!)).toBe('language-leak fail · 2 turns');
  });

  test('one failing turn reads "1 turn"', () => {
    expect(judgeChip(judgeResults([score('language-leak', 3, 0), score('language-leak', 1, 1)])[0]!)).toBe('language-leak fail · 1 turn');
  });

  test('pass if every scored turn passed', () => {
    const [r] = judgeResults([score('language-leak', 1, 1), score('language-leak', 3, 1)]);
    expect(r).toEqual({ name: 'language-leak', verdict: 'pass', failingTurns: 0 });
    expect(judgeChip(r!)).toBe('language-leak pass');
  });

  test('a transcript-level fail has no turn count', () => {
    expect(judgeChip(judgeResults([score('tone', null, 0)])[0]!)).toBe('tone fail');
  });

  test('no result when only sdk or human scores exist, and deferred judge scores do not count', () => {
    expect(judgeResults([score('exercise_match', null, 0, 'sdk'), score('language-leak', null, 0, 'human'), score('language-leak', 3, 0, 'judge', 'defer')])).toEqual([]);
  });
});

describe('trace list judge chips', () => {
  const { app } = pageApp();
  const ids = { failing: uuid7(), passing: uuid7(), unscored: uuid7(), run: '' };
  const messages = [
    { turn: 0, role: 'user', content: 'hi' },
    { turn: 1, role: 'assistant', content: 'hello' },
    { turn: 2, role: 'user', content: 'again' },
    { turn: 3, role: 'assistant', content: 'hallo' },
  ];

  beforeAll(async () => {
    const ds = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'concierge', name: 'prod' }));
    ids.run = (await json<{ id: string }>(await send(app, 'POST', '/api/runs', { dataset_id: ds.id, name: 'prod-oct' }))).id;
    const trace = (id: string) => ({ id, project: 'concierge', run_id: ids.run, messages, start: '2026-10-01T10:00:00.000Z' });
    await send(app, 'POST', '/api/traces/batch', { traces: [trace(ids.failing), trace(ids.passing), trace(ids.unscored)] });
    const v = await json<{ id: string }>(await send(app, 'POST', '/api/judges/language-leak/versions', { prompt: 'p', model: 'fake:contains', scope: 'turn', created_by: 'human' }));
    const judged = (turn: number, value: number) => ({ name: 'language-leak', value, turn, source: 'judge', judge_version_id: v.id });
    await send(app, 'PUT', `/api/traces/${ids.failing}/scores`, { scores: [judged(1, 1), judged(3, 0)] });
    await send(app, 'PUT', `/api/traces/${ids.passing}/scores`, { scores: [judged(1, 1), judged(3, 1)] });
  });

  const row = (html: string, id: string): string => html.slice(html.indexOf(`data-peek-id="${id}"`)).split('</div>')[0] ?? '';

  test('the traces list shows pass or fail with the failing turn count, and nothing for an unscored trace', async () => {
    const [, html] = await page(app, '/traces');
    expect(row(html, ids.failing)).toContain('>language-leak fail · 1 turn</span>');
    expect(row(html, ids.failing)).not.toContain('language-leak 0%');
    expect(row(html, ids.failing)).not.toContain('language-leak 50%');
    expect(row(html, ids.passing)).toContain('>language-leak pass</span>');
    expect(row(html, ids.unscored)).not.toContain('language-leak');
  });

  test('run detail rows use the same rule for the primary score', async () => {
    const [, html] = await page(app, `/runs/${ids.run}`);
    expect(row(html, ids.failing)).toContain('>language-leak fail · 1 turn</span>');
    expect(row(html, ids.passing)).toContain('>language-leak pass</span>');
    expect(row(html, ids.unscored)).not.toContain('language-leak');
  });
});
