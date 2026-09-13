import { Hono } from 'hono';
import type { Repos } from '../db/repos/index.ts';
import { compare } from '../services/compare.ts';
import { createDataset, getDataset, upsertItems } from '../services/datasets.ts';
import { compareQuery, datasetCreate, itemsUpsert } from './schemas.ts';

export const datasetsApi = (repos: Repos) => {
  const api = new Hono();

  api.post('/', async (c) => {
    const body = datasetCreate.parse(await c.req.json());
    const { dataset, created } = createDataset(repos, body);
    return c.json(dataset, created ? 201 : 200);
  });

  api.get('/:id', (c) => c.json(getDataset(repos, c.req.param('id'))));

  api.put('/:id/items', async (c) => {
    const body = itemsUpsert.parse(await c.req.json());
    return c.json(upsertItems(repos, c.req.param('id'), body.items));
  });

  api.get('/:id/compare', (c) => {
    const q = compareQuery.parse(c.req.query());
    return c.json(compare(repos, c.req.param('id'), q.runs, q.only));
  });

  return api;
};
