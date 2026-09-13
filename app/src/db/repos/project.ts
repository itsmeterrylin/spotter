import type { Database } from 'bun:sqlite';
import { uuid7 } from '@spotter/evals/uuid7';
import { must, nowIso } from '../json.ts';

export type Project = { id: string; name: string; created_at: string };

export const projectRepo = (db: Database) => {
  const byId = db.query<Project, [string]>('SELECT * FROM project WHERE id = ?');
  const byName = db.query<Project, [string]>('SELECT * FROM project WHERE name = ?');
  const insert = db.query<Project, [string, string, string]>('INSERT INTO project (id, name, created_at) VALUES (?, ?, ?) RETURNING *');

  return {
    get: (id: string): Project | null => byId.get(id),
    getByName: (name: string): Project | null => byName.get(name),
    ensure: (name: string): Project => byName.get(name) ?? must(insert.get(uuid7(), name, nowIso()), 'project'),
  };
};

export type ProjectRepo = ReturnType<typeof projectRepo>;
