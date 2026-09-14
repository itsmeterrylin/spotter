import { parseJson } from '../db/json.ts';
import type { Repos } from '../db/repos/index.ts';
import type { Json } from '../db/types.ts';
import { invalid } from '../errors.ts';
import { getDataset } from '../services/datasets.ts';
import { disagreements } from '../services/disagreements.ts';
import { getJudge, labelTarget, listJudges } from '../services/judges.ts';
import { query } from '../services/query.ts';
import { getRun } from '../services/runs.ts';
import { getTrace } from '../services/traces.ts';
import { urls } from '../urls.ts';
import type { ToolResult } from './result.ts';
import type { ReadArgs } from './schemas.ts';

const need = (id: string | undefined): string => {
  if (!id) throw invalid('id is required');
  return id;
};

const lit = (s: string): string => `'${s.replace(/'/g, "''")}'`;

const count = (repos: Repos, sql: string): number => Number(query(repos.db, `SELECT COUNT(*) AS n ${sql}`).rows[0]?.n ?? 0);

const dataset = (repos: Repos, id: string): ToolResult => {
  const view = getDataset(repos, id);
  const runs = query(repos.db, `SELECT * FROM run WHERE dataset_id = ${lit(id)} ORDER BY started_at DESC`).rows.map((r) => ({
    ...r,
    metadata: typeof r.metadata === 'string' ? parseJson<Json>(r.metadata) : null,
    url: urls.run(String(r.id)),
  }));
  return { ...view, runs };
};

const audit = (repos: Repos): ToolResult => ({
  datasets: count(repos, 'FROM dataset'),
  runs: count(repos, 'FROM run'),
  traces: count(repos, 'FROM trace'),
  human_labels: count(repos, "FROM score WHERE source = 'human'"),
  runs_without_baseline: count(repos, "FROM run WHERE json_extract(metadata, '$.baseline') IS NULL"),
  datasets_without_runs: count(repos, 'FROM dataset d WHERE NOT EXISTS (SELECT 1 FROM run r WHERE r.dataset_id = d.id)'),
  judges: listJudges(repos).judges.map((j) => ({
    name: j.name,
    active_version: j.active_version,
    status: j.status,
    labels: j.labels,
    labels_needed: Math.max(0, labelTarget - j.labels),
    disagreements: j.disagreements,
    url: j.url,
  })),
  url: urls.inbox(),
});

export function read(repos: Repos, args: ReadArgs): ToolResult {
  switch (args.type) {
    case 'run':
      return getRun(repos, need(args.id));
    case 'trace':
      return getTrace(repos, need(args.id));
    case 'dataset':
      return dataset(repos, need(args.id));
    case 'judge': {
      const view = getJudge(repos, need(args.id));
      return { ...view, disagreements: view.active_version === null ? [] : disagreements(repos, view.name, 'active').traces };
    }
    case 'audit':
      return audit(repos);
  }
}
