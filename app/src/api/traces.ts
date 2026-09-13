import { Hono } from 'hono';
import type { Repos } from '../db/repos/index.ts';
import { getTrace, insertBatch, listTraces, patchMetadata, putScores } from '../services/traces.ts';
import { metadataPatch, scoresPut, toNewScore, traceListQuery, tracesBatch } from './schemas.ts';

export const tracesApi = (repos: Repos) => {
  const api = new Hono();

  api.get('/', (c) => c.json(listTraces(repos, traceListQuery.parse(c.req.query()))));

  api.post('/batch', async (c) => {
    const body = tracesBatch.parse(await c.req.json());
    const traces = body.traces.map(({ scores, ...t }) => ({ ...t, scores: scores?.map(toNewScore) }));
    return c.json(insertBatch(repos, traces), 201);
  });

  api.get('/:id', (c) => c.json(getTrace(repos, c.req.param('id'))));

  api.put('/:id/scores', async (c) => {
    const body = scoresPut.parse(await c.req.json());
    return c.json(putScores(repos, c.req.param('id'), body.scores.map(toNewScore)));
  });

  api.patch('/:id/metadata', async (c) => {
    const body = metadataPatch.parse(await c.req.json());
    return c.json(patchMetadata(repos, c.req.param('id'), body));
  });

  return api;
};
