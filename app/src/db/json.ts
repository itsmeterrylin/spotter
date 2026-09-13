import type { Json } from './types.ts';

export const parseJson = <T extends Json>(text: string | null): T | null => (text === null ? null : (JSON.parse(text) as T));

export const toJson = (value: Json | null | undefined): string | null => (value === null || value === undefined ? null : JSON.stringify(value));

export const nowIso = (): string => new Date().toISOString();

export function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`${what} missing after write`);
  return value;
}
