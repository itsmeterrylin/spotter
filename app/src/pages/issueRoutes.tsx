import { type Context, Hono } from 'hono';
import { z } from 'zod';
import type { Repos } from '../db/repos/index.ts';
import { getIssue, issueStatuses, listIssues } from '../services/issues.ts';
import { getTrace } from '../services/traces.ts';
import type { Shell } from './data.ts';
import { IssuePage, IssuesPage, type IssueTab } from './Issues.tsx';

const listQuery = z.object({ status: z.enum(issueStatuses).default('open'), project: z.string().min(1).optional() });
const tabQuery = z.enum(['overview', 'traces', 'backtest']).default('overview');

export function issueRoutes(repos: Repos, shell: () => Shell): Hono {
  const app = new Hono();

  const list = (c: Context) => {
    const q = listQuery.parse(c.req.query());
    const result = listIssues(repos, q);
    return c.html(<IssuesPage issues={result.issues} status={q.status} counts={result.counts} project={q.project} shell={shell()} />);
  };
  app.get('/', list);
  app.get('/issues', list);

  app.get('/issues/:id', (c) => {
    const issue = getIssue(repos, c.req.param('id'));
    const tab: IssueTab = tabQuery.parse(c.req.query('tab'));
    return c.html(
      <IssuePage
        issue={issue}
        tab={tab}
        seed={issue.seed_trace_id ? getTrace(repos, issue.seed_trace_id) : null}
        projectTraces={repos.traces.count(issue.project_id)}
        judges={repos.judges.list()}
        shell={shell()}
      />,
    );
  });

  return app;
}
