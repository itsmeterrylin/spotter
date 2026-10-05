import { describe, expect, test } from 'bun:test';
import { isUuid, uuid7 } from '../src/uuid7.ts';

describe('uuid7', () => {
  test('is a version 7 uuid', () => {
    const id = uuid7();
    expect(isUuid(id)).toBe(true);
    expect(id[14]).toBe('7');
  });

  test('sorts by creation order, even inside one millisecond', () => {
    const ids = Array.from({ length: 5000 }, () => uuid7());
    const sorted = [...ids].sort();
    expect(sorted).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('encodes the timestamp in the first 48 bits', () => {
    const before = Date.now();
    const id = uuid7();
    const ms = parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
    expect(ms).toBeGreaterThanOrEqual(before);
    expect(ms).toBeLessThanOrEqual(before + 10);
  });
});
