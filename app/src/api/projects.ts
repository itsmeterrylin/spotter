import { Hono } from 'hono';
import type { Repos } from '../db/repos/index.ts';
import { getAttributeMap, putAttributeMap } from '../services/attributeMap.ts';
import { attributeMapPut } from './schemas.ts';

export const projectsApi = (repos: Repos) => {
  const api = new Hono();

  api.get('/:id/attribute-map', (c) => c.json(getAttributeMap(repos, c.req.param('id'))));

  api.put('/:id/attribute-map', async (c) => c.json(putAttributeMap(repos, c.req.param('id'), attributeMapPut.parse(await c.req.json()))));

  return api;
};
