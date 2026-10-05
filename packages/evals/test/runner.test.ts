import { describe, expect, test } from 'bun:test';
import { defineEval } from '../src/index.ts';
import { runName, variantOf } from '../src/runner.ts';

const def = defineEval({ dataset: 'd', metadata: { variant_env: ['TAGGING_RULES', 'MODEL'] }, task: () => null, scores: [] });

describe('run naming', () => {
  test('variantOf joins the values of the env vars the eval names, in order', () => {
    expect(variantOf(def, {})).toBeNull();
    expect(variantOf(def, { TAGGING_RULES: 'v2' })).toBe('v2');
    expect(variantOf(def, { TAGGING_RULES: 'v2', MODEL: 'small', OTHER: 'x' })).toBe('v2 small');
    expect(variantOf(defineEval({ dataset: 'd', task: () => null, scores: [] }), { TAGGING_RULES: 'v2' })).toBeNull();
  });

  test('runName counts from one and appends the variant', () => {
    expect(runName('tagging.example', 0, null)).toBe('tagging.example #1');
    expect(runName('tagging.example', 1, 'v2')).toBe('tagging.example #2 (v2)');
  });
});
