import { Hono } from 'hono';
import type { Repos } from '../db/repos/index.ts';
import { attachOccurrences, getIssue, listIssues, updateIssue, upsertIssue } from '../services/issues.ts';
import { issueAttach, issueListQuery, issuePatch, issueUpsert } from './schemas.ts';

export const issuesApi = (repos: Repos) => {
  const api = new Hono();

  api.get('/', (c) => c.json(listIssues(repos, issueListQuery.parse(c.req.query()))));

  api.post('/', async (c) => {
    const result = upsertIssue(repos, issueUpsert.parse(await c.req.json()));
    return c.json(result, result.created ? 201 : 200);
  });

  api.get('/:id', (c) => c.json(getIssue(repos, c.req.param('id'))));

  api.patch('/:id', async (c) => c.json(updateIssue(repos, c.req.param('id'), issuePatch.parse(await c.req.json()))));

  api.post('/:id/traces', async (c) => {
    const body = issueAttach.parse(await c.req.json());
    return c.json(attachOccurrences(repos, c.req.param('id'), body.traces, body.created_by));
  });

  return api;
};
