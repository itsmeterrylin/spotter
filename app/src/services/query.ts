import { SQLiteError, type Database } from 'bun:sqlite';
import { invalid } from '../errors.ts';
import { urls } from '../urls.ts';

export const maxRows = 1000;

export type QueryResult = { rows: Record<string, unknown>[]; row_count: number; truncated: boolean; url: string };

export function guardSelect(sql: string): string {
  const trimmed = sql.trim().replace(/;\s*$/, '');
  if (trimmed.length === 0) throw invalid('sql is empty');
  if (trimmed.includes(';')) throw invalid('one statement only');
  if (/--|\/\*/.test(trimmed)) throw invalid('comments are not allowed');
  if (!/^(select|with)\b/i.test(trimmed)) throw invalid('only a single SELECT is allowed');
  return trimmed;
}

function readOnly(db: Database, sql: string): Record<string, unknown>[] {
  db.exec('PRAGMA query_only = ON');
  try {
    return db.query<Record<string, unknown>, []>(`SELECT * FROM (${sql}) LIMIT ${maxRows + 1}`).all();
  } catch (err) {
    if (err instanceof SQLiteError) throw invalid(err.message);
    throw err;
  } finally {
    db.exec('PRAGMA query_only = OFF');
  }
}

export function query(db: Database, sql: string): QueryResult {
  const safe = guardSelect(sql);
  const rows = readOnly(db, safe);
  const truncated = rows.length > maxRows;
  return { rows: rows.slice(0, maxRows), row_count: Math.min(rows.length, maxRows), truncated, url: urls.query(safe) };
}
