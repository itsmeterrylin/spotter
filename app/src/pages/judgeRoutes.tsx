import { Hono } from 'hono';
import { versionNumber } from '../api/schemas.ts';
import type { Repos } from '../db/repos/index.ts';
import { notFound } from '../errors.ts';
import { activate, disagreementCount, getJudge, type JudgeView, listJudges, requireVersion } from '../services/judges.ts';
import { urls } from '../urls.ts';
import { JudgePage, JudgesPage } from './Judges.tsx';
import { JudgeVersionPage } from './JudgeVersion.tsx';

const activeDisagreements = (repos: Repos, judge: JudgeView): number | null => (judge.active_version_id ? disagreementCount(repos, judge.active_version_id) : null);

export function judgeRoutes(repos: Repos, unread: () => number): Hono {
  const app = new Hono();

  app.get('/', (c) => c.html(<JudgesPage judges={listJudges(repos).judges} unread={unread()} />));

  app.get('/:name', (c) => {
    const judge = getJudge(repos, c.req.param('name'));
    return c.html(<JudgePage judge={judge} disagreements={activeDisagreements(repos, judge)} unread={unread()} />);
  });

  app.post('/:name/activate', async (c) => {
    const form = await c.req.parseBody();
    const view = activate(repos, c.req.param('name'), versionNumber.parse(form.version));
    return c.redirect(view.url, 303);
  });

  app.get('/:name/versions/:number', (c) => {
    const judge = getJudge(repos, c.req.param('name'));
    const number = versionNumber.parse(c.req.param('number'));
    const version = judge.versions.find((v) => v.number === number);
    if (!version) throw notFound(`judge ${judge.name} version`, String(number));
    const disagreements = version.active ? activeDisagreements(repos, judge) : null;
    return c.html(<JudgeVersionPage judge={judge} version={version} disagreements={disagreements} unread={unread()} />);
  });

  app.get('/:name/disagreements', (c) => {
    const name = c.req.param('name');
    const raw = c.req.query('version');
    const { version } = requireVersion(repos, name, raw === undefined ? 'active' : versionNumber.parse(raw));
    return c.redirect(urls.review({ judge: name, version: version.number }));
  });

  return app;
}
