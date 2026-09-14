import { Hono } from 'hono';
import type { Repos } from '../db/repos/index.ts';
import { disagreements } from '../services/disagreements.ts';
import { activate, getJudge, listJudges, propose } from '../services/judges.ts';
import { disagreementsQuery, judgeActivate, judgePropose } from './schemas.ts';

export const judgesApi = (repos: Repos) => {
  const api = new Hono();

  api.get('/', (c) => c.json(listJudges(repos)));

  api.get('/:name', (c) => c.json(getJudge(repos, c.req.param('name'))));

  api.post('/:name/versions', async (c) => {
    const body = judgePropose.parse(await c.req.json());
    const result = propose(repos, { ...body, name: c.req.param('name') });
    return c.json({ ...result.version, existing: result.existing, judge_url: result.judge.url }, result.existing ? 200 : 201);
  });

  api.post('/:name/activate', async (c) => {
    const body = judgeActivate.parse(await c.req.json());
    return c.json(activate(repos, c.req.param('name'), body.version));
  });

  api.get('/:name/disagreements', (c) => {
    const q = disagreementsQuery.parse(c.req.query());
    return c.json(disagreements(repos, c.req.param('name'), q.version ?? 'active'));
  });

  return api;
};
