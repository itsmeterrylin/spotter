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
import { peekFromQuery } from './peekRoutes.tsx';

const listQuery = z.object({ state: z.enum([...judgeStates, 'all']).default('all') });
const tabQuery = z.enum(['overview', 'versions', 'disagreements', 'issues']).default('overview');

export function judgeRoutes(repos: Repos, shell: () => Shell): Hono {
  const app = new Hono();

  app.get('/', (c) => {
    const filter: JudgeFilter = listQuery.parse(c.req.query()).state;
    const all = listJudges(repos).judges;
    const counts = { all: all.length, draft: 0, live: 0, paused: 0 };
    for (const j of all) counts[j.state] += 1;
    const { selected, pane } = peekFromQuery(repos, c, (name) => ({ kind: 'judge', name }));
    return c.html(<JudgesPage judges={filter === 'all' ? all : all.filter((j) => j.state === filter)} filter={filter} counts={counts} shell={shell()} selected={selected} pane={pane} />);
  });

  app.get('/:name', (c) => {
    const judge = getJudge(repos, c.req.param('name'));
    const tab: JudgeTab = tabQuery.parse(c.req.query('tab'));
    const found = judge.active_version_id ? disagreements(repos, judge.name, 'active').traces : [];
    const { selected, pane } = peekFromQuery(repos, c, (id) => (tab === 'versions' ? { kind: 'version', name: judge.name, number: versionNumber.parse(id) } : { kind: 'issue', id }));
    return c.html(<JudgePage judge={judge} tab={tab} disagreements={found} issues={issuesForJudge(repos, judge.name)} shell={shell()} selected={selected} pane={pane} />);
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
    return c.html(<JudgeVersionPage judge={judge} version={version} disagreements={disagreementCount(repos, version.id)} shell={shell()} />);
  });

  app.get('/:name/disagreements', (c) => {
    const name = c.req.param('name');
    const raw = c.req.query('version');
    const { version } = requireVersion(repos, name, raw === undefined ? 'active' : versionNumber.parse(raw));
    return c.redirect(urls.review({ judge: name, version: version.number }));
  });

  return app;
}
