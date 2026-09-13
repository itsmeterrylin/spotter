import type { SQLQueryBindings } from 'bun:sqlite';
import type { Json } from '../db/types.ts';
import { invalid } from '../errors.ts';

export const operators = ['=', '!=', '<', '<=', '>', '>=', 'contains', 'starts_with', 'in', 'is_empty'] as const;
export type Operator = (typeof operators)[number];

export type Filter = { field: string; key?: string; operator: Operator; value?: Json };

export type Where = { where: string; params: SQLQueryBindings[] };

const columns = new Set(['id', 'project_id', 'run_id', 'dataset_item_id', 'start', 'end', 'created_at']);
const keyPattern = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;

const scalar = (v: Json | undefined, f: Filter): string | number => {
  if (typeof v === 'string' || typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  throw invalid(`filter ${f.field} needs a string or number value`);
};

const list = (v: Json | undefined, f: Filter): Array<string | number> => {
  if (!Array.isArray(v) || v.length === 0) throw invalid(`filter ${f.field} with "in" needs a non-empty array`);
  return v.map((x) => scalar(x, f));
};

function clause(expr: string, f: Filter): Where {
  switch (f.operator) {
    case 'is_empty':
      return { where: `(${expr} IS NULL OR ${expr} = '')`, params: [] };
    case 'contains':
      return { where: `${expr} LIKE ?`, params: [`%${scalar(f.value, f)}%`] };
    case 'starts_with':
      return { where: `${expr} LIKE ?`, params: [`${scalar(f.value, f)}%`] };
    case 'in': {
      const xs = list(f.value, f);
      return { where: `${expr} IN (${xs.map(() => '?').join(', ')})`, params: xs };
    }
    default:
      return { where: `${expr} ${f.operator} ?`, params: [scalar(f.value, f)] };
  }
}

function exists(table: string, inner: Where): Where {
  return { where: `EXISTS (SELECT 1 FROM ${table} WHERE ${inner.where})`, params: inner.params };
}

function one(f: Filter): Where {
  const [head, ...rest] = f.field.split('.');
  const field = head ?? f.field;
  const key = f.key ?? (rest.length ? rest.join('.') : undefined);
  if (key !== undefined && !keyPattern.test(key)) throw invalid(`filter key ${key} is not a plain key`);
  if (columns.has(field)) return clause(`trace."${field}"`, f);
  if (field === 'metadata') {
    if (key === undefined) throw invalid('metadata filters need a key');
    const c = clause('json_extract(trace.metadata, ?)', f);
    return { where: c.where, params: [`$.${key}`, ...c.params] };
  }
  if (field === 'tags') {
    if (f.operator === 'is_empty') return { where: '(trace.tags IS NULL OR json_array_length(trace.tags) = 0)', params: [] };
    return exists('json_each(trace.tags)', clause('value', f));
  }
  if (field === 'events') {
    const c = clause(`json_extract(value, ?)`, f);
    return exists('json_each(trace.events)', { where: c.where, params: [`$.${key ?? 'name'}`, ...c.params] });
  }
  if (field === 'source') {
    const c = exists('score s', { where: 's.trace_id = trace.id AND s.source = ?', params: [scalar(f.value, f)] });
    return f.operator === '!=' ? { where: `NOT ${c.where}`, params: c.params } : c;
  }
  if (field === 'score') {
    if (key === undefined) throw invalid('score filters need a key with the score name');
    if (f.operator === 'is_empty') return { where: 'NOT EXISTS (SELECT 1 FROM score s WHERE s.trace_id = trace.id AND s.name = ?)', params: [key] };
    const c = clause('s.value', f);
    return exists('score s', { where: `s.trace_id = trace.id AND s.name = ? AND ${c.where}`, params: [key, ...c.params] });
  }
  throw invalid(`unknown filter field ${f.field}`);
}

export function toWhere(filters: Filter[], runId?: string): Where {
  const parts = filters.map(one);
  if (runId) parts.push({ where: 'trace.run_id = ?', params: [runId] });
  if (parts.length === 0) return { where: '1 = 1', params: [] };
  return { where: parts.map((p) => `(${p.where})`).join(' AND '), params: parts.flatMap((p) => p.params) };
}
