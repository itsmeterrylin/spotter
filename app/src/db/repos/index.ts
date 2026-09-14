import type { Database } from 'bun:sqlite';
import { attributeMapRepo } from './attributeMap.ts';
import { datasetRepo } from './dataset.ts';
import { judgeRepo } from './judge.ts';
import { projectRepo } from './project.ts';
import { runRepo } from './run.ts';
import { scoreRepo } from './score.ts';
import { traceRepo } from './trace.ts';

export const createRepos = (db: Database) => ({
  db,
  projects: projectRepo(db),
  datasets: datasetRepo(db),
  runs: runRepo(db),
  traces: traceRepo(db),
  scores: scoreRepo(db),
  judges: judgeRepo(db),
  attributeMaps: attributeMapRepo(db),
  tx: <T>(fn: () => T): T => db.transaction(fn)(),
});

export type Repos = ReturnType<typeof createRepos>;
