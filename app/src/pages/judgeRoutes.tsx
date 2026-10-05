import { Hono } from 'hono';
import { z } from 'zod';
import { versionNumber } from '../api/schemas.ts';
import type { Repos } from '../db/repos/index.ts';
import { notFound } from '../errors.ts';
import { disagreements } from '../services/disagreements.ts';
import { issuesForJudge } from '../services/issues.ts';
import { activate, disagreementCount, getJudge, type JudgeView, judgeStates, listJudges, requireVersion } from '../services/judges.ts';
import { urls } from '../urls.ts';
import type { Shell } from './data.ts';
import { JudgePage, type JudgeTab } from './JudgeDetail.tsx';
import { type JudgeFilter, JudgesPage } from './Judges.tsx';
import { JudgeVersionPage } from './JudgeVersion.tsx';

const listQuery = z.object({ state: z.enum([...judgeStates, 'all']).default('all') });
const tabQuery = z.enum(['overview', 'versions', 'disagreements', 'issues']).default('overview');

const activeDisagreements = (repos: Repos, judge: JudgeView): number | null => (judge.active_version_id ? disagreementCount(repos, judge.active_version_id) : null);

export function judgeRoutes(repos: Repos, shell: () => Shell): Hono {
  const app = new Hono();

  app.get('/', (c) => {
    const filter: JudgeFilter = listQuery.parse(c.req.query()).state;
    const all = listJudges(repos).judges;
    const counts = { all: all.length, draft: 0, live: 0, paused: 0 };
    for (const j of all) counts[j.state] += 1;
    return c.html(<JudgesPage judges={filter === 'all' ? all : all.filter((j) => j.state === filter)} filter={filter} counts={counts} shell={shell()} />);
  });

  app.get('/:name', (c) => {
    const judge = getJudge(repos, c.req.param('name'));
    const tab: JudgeTab = tabQuery.parse(c.req.query('tab'));
    const found = judge.active_version_id ? disagreements(repos, judge.name, 'active').traces : [];
    return c.html(<JudgePage judge={judge} tab={tab} disagreements={found} issues={issuesForJudge(repos, judge.name)} shell={shell()} />);
  });

  app.post('/:name/activate', async (c) => {
    const form = await c.req.parseBody();
    const view = activate(repos, c.req.param('name'), versionNumber.parse(form.version), 'human');
    return c.redirect(view.url, 303);
  });

  app.get('/:name/versions/:number', (c) => {
    const judge = getJudge(repos, c.req.param('name'));
    const number = versionNumber.parse(c.req.param('number'));
    const version = judge.versions.find((v) => v.number === number);
    if (!version) throw notFound(`judge ${judge.name} version`, String(number));
    const count = version.active ? activeDisagreements(repos, judge) : null;
    return c.html(<JudgeVersionPage judge={judge} version={version} disagreements={count} shell={shell()} />);
  });

  app.get('/:name/disagreements', (c) => {
    const name = c.req.param('name');
    const raw = c.req.query('version');
    const { version } = requireVersion(repos, name, raw === undefined ? 'active' : versionNumber.parse(raw));
    return c.redirect(urls.review({ judge: name, version: version.number }));
  });

  return app;
}
