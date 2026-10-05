import { Database } from 'bun:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const schema = readFileSync(join(import.meta.dir, 'schema.sql'), 'utf8');

const judgeStateColumn = "ALTER TABLE judge ADD COLUMN state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','live','paused'))";

/** Databases created before a column existed keep their old table shape; add what is missing. */
function migrate(db: Database): void {
  const columns = db.query<{ name: string }, []>('PRAGMA table_info(judge)').all();
  if (!columns.some((c) => c.name === 'state')) db.exec(judgeStateColumn);
}

export function openDatabase(path: string): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true, strict: true });
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(schema);
  migrate(db);
  return db;
}
