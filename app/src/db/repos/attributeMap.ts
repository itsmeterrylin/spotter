import type { Database } from 'bun:sqlite';

export type MapType = 'string' | 'number' | 'boolean';
export type MapEntry = { source: string; target: string; type: MapType };

type Row = MapEntry & { project_id: string };

export const attributeMapRepo = (db: Database) => {
  const byProject = db.query<Row, [string]>('SELECT * FROM attribute_map WHERE project_id = ? ORDER BY source');
  const clear = db.query<Row, [string]>('DELETE FROM attribute_map WHERE project_id = ?');
  const insert = db.query<Row, [string, string, string, MapType]>('INSERT INTO attribute_map (project_id, source, target, type) VALUES (?, ?, ?, ?)');

  const replace = db.transaction((projectId: string, entries: MapEntry[]): void => {
    clear.run(projectId);
    for (const e of entries) insert.run(projectId, e.source, e.target, e.type);
  });

  return {
    list: (projectId: string): MapEntry[] => byProject.all(projectId).map(({ source, target, type }) => ({ source, target, type })),
    replace: (projectId: string, entries: MapEntry[]): void => replace(projectId, entries),
  };
};

export type AttributeMapRepo = ReturnType<typeof attributeMapRepo>;
