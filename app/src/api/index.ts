import { Hono } from 'hono';
import { ZodError, z } from 'zod';
import type { Repos } from '../db/repos/index.ts';
import { ApiError } from '../errors.ts';
import { query } from '../services/query.ts';
import { datasetsApi } from './datasets.ts';
import { judgesApi } from './judges.ts';
import { runsApi } from './runs.ts';
import { querySql } from './schemas.ts';
import { tracesApi } from './traces.ts';

const error = (code: string, message: string) => ({ error: { code, message } });

export const createApi = (repos: Repos) => {
  const api = new Hono();

  api.onError((err, c) => {
    if (err instanceof ApiError) return c.json(error(err.code, err.message), err.status);
    if (err instanceof ZodError) return c.json(error('invalid', z.prettifyError(err)), 400);
    if (err instanceof SyntaxError) return c.json(error('invalid', 'body is not valid JSON'), 400);
    console.error(err);
    return c.json(error('internal', err.message), 500);
  });

  api.notFound((c) => c.json(error('not_found', `${c.req.method} ${c.req.path} is not a route`), 404));

  api.route('/datasets', datasetsApi(repos));
  api.route('/runs', runsApi(repos));
  api.route('/traces', tracesApi(repos));
  api.route('/judges', judgesApi(repos));
  api.post('/query', async (c) => c.json(query(repos.db, querySql.parse(await c.req.json()).sql)));

  return api;
};
