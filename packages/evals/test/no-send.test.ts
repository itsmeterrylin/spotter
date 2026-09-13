import { afterEach, describe, expect, test } from 'bun:test';
import { loadEval } from '../src/load.ts';
import { runEval, type RunOptions } from '../src/runner.ts';
import { parseArgs } from '../src/cli.ts';

const evalFile = new URL('../../../evals/tagging.example.ts', import.meta.url).pathname;

const options = (): RunOptions => ({ name: 'tagging.example', send: false, create: false, client: { url: 'http://127.0.0.1:1' } });

describe('spotter run --no-send', () => {
  afterEach(() => {
    delete process.env.TAGGING_RULES;
  });

  test('runs the sample eval in memory and reports the means', async () => {
    const loaded = await loadEval(evalFile);
    const report = await runEval(loaded.def, loaded.items, options());
    expect(report.run_id).toBeNull();
    expect(report.run_url).toBeNull();
    expect(report.results).toHaveLength(12);
    expect(report.summary.scores.exercise_match?.mean).toBeCloseTo(11 / 12);
    expect(report.summary.scores.exercise_match?.n).toBe(12);
    expect(report.summary.scores.weight_found?.mean).toBe(1);
    expect(report.summary.scores.exercise_match?.diff).toBeNull();
    expect(report.results.every((r) => r.duration_ms >= 0 && r.start <= r.end)).toBe(true);
  });

  test('rules v2 changes the exercise_match mean on three items', async () => {
    process.env.TAGGING_RULES = 'v2';
    const loaded = await loadEval(evalFile);
    const report = await runEval(loaded.def, loaded.items, options());
    expect(report.summary.scores.exercise_match?.mean).toBeCloseTo(10 / 12);
    const failing = report.results.filter((r) => r.scores.some((s) => s.name === 'exercise_match' && s.value === 0)).map((r) => r.item.id);
    expect(failing).toEqual(['tagging-02', 'tagging-09']);
  });

  test('refuses --no-send when the file has no items', async () => {
    const loaded = await loadEval(evalFile);
    await expect(runEval(loaded.def, null, options())).rejects.toThrow('export items');
  });

  test('parses flags with and without values', () => {
    expect(parseArgs(['run', 'x.ts', '--baseline', 'abc', '--no-send'])).toEqual({ positional: ['run', 'x.ts'], flags: { baseline: 'abc', 'no-send': true } });
    expect(parseArgs(['compare', 'a', 'b'])).toEqual({ positional: ['compare', 'a', 'b'], flags: {} });
  });
});
