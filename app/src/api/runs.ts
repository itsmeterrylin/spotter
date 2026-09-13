import { Hono } from 'hono';
import type { Repos } from '../db/repos/index.ts';
import { createRun, getRun } from '../services/runs.ts';
import { summary } from '../services/summary.ts';
import { runCreate, summaryQuery } from './schemas.ts';

export const runsApi = (repos: Repos) => {
  const api = new Hono();

  api.post('/', async (c) => {
    const body = runCreate.parse(await c.req.json());
    const { run, created } = createRun(repos, body);
    return c.json(run, created ? 201 : 200);
  });

  api.get('/:id', (c) => c.json(getRun(repos, c.req.param('id'))));

  api.get('/:id/summary', (c) => {
    const q = summaryQuery.parse(c.req.query());
    return c.json(summary(repos, c.req.param('id'), q.compare_to));
  });

  return api;
};
