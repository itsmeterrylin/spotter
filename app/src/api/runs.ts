import { Hono } from 'hono';
import { z } from 'zod';
import type { Repos } from '../db/repos/index.ts';
import { notFound } from '../errors.ts';
import { createRun, getRun } from '../services/runs.ts';
import { summary } from '../services/summary.ts';
import { deepMerge } from '../services/traces.ts';
import { runCreate, summaryQuery } from './schemas.ts';

const runPatch = z.object({ metadata: z.record(z.string(), z.json()).optional() });

export const runsApi = (repos: Repos) => {
  const api = new Hono();

  api.post('/', async (c) => {
    const body = runCreate.parse(await c.req.json());
    const { run, created } = createRun(repos, body);
    return c.json(run, created ? 201 : 200);
  });

  api.get('/:id', (c) => c.json(getRun(repos, c.req.param('id'))));

  api.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const body = runPatch.parse(await c.req.json());
    const run = repos.runs.get(id);
    if (!run) throw notFound('run', id);
    if (body.metadata) repos.db.query('UPDATE run SET metadata = ? WHERE id = ?').run(JSON.stringify(deepMerge(run.metadata ?? {}, body.metadata)), id);
    repos.runs.end(id);
    return c.json(getRun(repos, id));
  });

  api.get('/:id/summary', (c) => {
    const q = summaryQuery.parse(c.req.query());
    return c.json(summary(repos, c.req.param('id'), q.compare_to));
  });

  return api;
};
