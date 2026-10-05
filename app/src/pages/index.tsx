import { type Context, Hono } from 'hono';
import { ZodError } from 'zod';
import { versionNumber } from '../api/schemas.ts';
import type { Repos } from '../db/repos/index.ts';
import { notFound } from '../errors.ts';
import { compare } from '../services/compare.ts';
import { getDataset } from '../services/datasets.ts';
import { counts, rollup } from '../services/rollup.ts';
import { getTrace } from '../services/traces.ts';
import { urls } from '../urls.ts';
import { clientBundle, favicon, pagesCss } from './assets.ts';
import { ComparePage } from './Compare.tsx';
import { humanVerdict, judgeSaid, neighbors, primaryScore, queue, runCard, shellData, type Queue, type Shell } from './data.ts';
import { issueRoutes } from './issueRoutes.tsx';
import { judgeRoutes } from './judgeRoutes.tsx';
import { listRoutes } from './listRoutes.tsx';
import { badLink, compareNeedsTwo, ErrorPage, missingPage, viewOf } from './NotFound.tsx';
import { ReviewEmpty, ReviewPage } from './Review.tsx';
import { SettingsPage } from './Settings.tsx';
import { getAttributeMap } from '../services/attributeMap.ts';
import { RunPage, type TraceRow } from './Run.tsx';
import { TracePage, TracePane } from './Trace.tsx';

const defaultFilter = 'unlabeled';

const reviewUrl = (traceId: string, q: Queue): string =>
  urls.reviewTrace(traceId, { run: q.run?.id, filter: q.filter === defaultFilter ? undefined : q.filter, judge: q.judge?.name, version: q.judge?.version });

const versionOf = (raw: string | undefined): number | undefined => (raw === undefined ? undefined : versionNumber.parse(raw));

const turnOf = (raw: string | undefined): number | undefined => (raw === undefined || raw === '' || Number.isNaN(Number(raw)) ? undefined : Number(raw));

const apiPrefixes = ['/api/', '/mcp'];

/** Top-level fallback: an unknown page renders inside the shell; API and MCP paths keep the plain 404. */
export const pageNotFound = (repos: Repos) => (c: Context) =>
  apiPrefixes.some((p) => c.req.path.startsWith(p)) ? c.text('404 Not Found', 404) : c.html(<ErrorPage view={missingPage(c.req.path)} shell={shellData(repos)} />, 404);

export function createPages(repos: Repos): Hono {
  const app = new Hono();
  const shell = (): Shell => shellData(repos);
  const runOrThrow = (id: string) => {
    const run = repos.runs.get(id);
    if (!run) throw notFound('run', id);
    return run;
  };

  app.onError((err, c) => {
    const view = err instanceof ZodError ? badLink : viewOf(err);
    if (!view) throw err;
    return c.html(<ErrorPage view={view} shell={shell()} />, view.status as 400 | 404 | 409 | 415);
  });

  app.get('/pages.css', () => new Response(pagesCss(), { headers: { 'content-type': 'text/css; charset=utf-8' } }));
  app.get('/favicon.svg', (c) => c.body(favicon, 200, { 'content-type': 'image/svg+xml' }));
  app.get('/favicon.ico', (c) => c.redirect('/favicon.svg'));

  app.get('/client/:file', async (c) => {
    const file = c.req.param('file');
    const js = await clientBundle(file.replace(/\.js$/, ''));
    if (js === undefined) throw notFound('client module', file);
    return c.body(js, 200, { 'content-type': 'text/javascript; charset=utf-8' });
  });

  app.route('/', issueRoutes(repos, shell));
  app.route('/', listRoutes(repos, shell));

  app.get('/runs/:id', (c) => {
    const run = runOrThrow(c.req.param('id'));
    const card = runCard(repos, run, c.req.query('score'));
    const rows: TraceRow[] = repos.traces.listByRun(run.id).map((trace) => {
      const scores = repos.scores.listByTrace(trace.id);
      const values = rollup(counts(repos, scores));
      return { trace, verdict: humanVerdict(scores), value: card.primary ? (values.get(card.primary) ?? null) : null };
    });
    return c.html(<RunPage card={card} rows={rows} shell={shell()} />);
  });

  app.get('/datasets/:id/compare', (c) => {
    const id = c.req.param('id');
    const runs = (c.req.query('runs') ?? '').split(',').filter(Boolean);
    const only = c.req.query('only') === 'changes';
    if (runs.length < 2) return c.html(<ErrorPage view={compareNeedsTwo(getDataset(repos, id))} shell={shell()} />, 400);
    const comparison = compare(repos, id, runs, only ? 'changes' : undefined);
    return c.html(<ComparePage comparison={comparison} dataset={getDataset(repos, id)} only={only} score={c.req.query('score')} shell={shell()} />);
  });

  app.get('/traces/:id/pane', (c) => {
    const trace = getTrace(repos, c.req.param('id'));
    const run = trace.run_id ? repos.runs.get(trace.run_id) : null;
    const closeHref = c.req.query('close') ?? urls.traces();
    return c.html(<TracePane trace={trace} run={run} verdict={humanVerdict(trace.scores)} closeHref={closeHref} />);
  });

  app.get('/traces/:id', (c) => {
    const trace = getTrace(repos, c.req.param('id'));
    const run = trace.run_id ? repos.runs.get(trace.run_id) : null;
    return c.html(<TracePage trace={trace} run={run} verdict={humanVerdict(trace.scores)} turn={turnOf(c.req.query('turn'))} issues={repos.issues.listByTrace(trace.id)} shell={shell()} />);
  });

  app.get('/review', (c) => {
    const filter = c.req.query('filter') ?? defaultFilter;
    const runId = c.req.query('run');
    if (runId) runOrThrow(runId);
    const q = queue(repos, { run: runId, filter, judge: c.req.query('judge'), version: versionOf(c.req.query('version')) });
    const first = q.ids[0];
    if (!first || (!q.run && !q.judge)) return c.html(<ReviewEmpty shell={shell()} />);
    return c.redirect(reviewUrl(first, q));
  });

  app.get('/review/:id', (c) => {
    const trace = getTrace(repos, c.req.param('id'));
    const filter = c.req.query('filter') ?? defaultFilter;
    const judge = c.req.query('judge');
    const runId = c.req.query('run') ?? trace.run_id ?? undefined;
    if (runId) runOrThrow(runId);
    const q: Queue = runId || judge ? queue(repos, { run: runId, filter, judge, version: versionOf(c.req.query('version')) }) : { run: null, filter, ids: [], judge: null };
    const { next, prev } = neighbors(q.ids, trace.id);
    const to = (id: string | null): string | null => (id && (q.run || q.judge) ? reviewUrl(id, q) : null);
    const verdict = humanVerdict(trace.scores);
    const score = verdict?.name ?? q.judge?.name ?? primaryScore([...new Set(trace.scores.map((s) => s.name))]) ?? 'human';
    return c.html(
      <ReviewPage
        trace={trace}
        verdict={verdict}
        judgeSaid={judgeSaid(trace.scores, q.judge)}
        score={score}
        queue={q}
        next={to(next)}
        prev={to(prev)}
        datasets={repos.datasets.list()}
        turn={turnOf(c.req.query('turn'))}
        shell={shell()}
      />,
    );
  });

  app.get('/settings', (c) => {
    const projects = [...new Set(repos.datasets.list().map((d) => d.project_id))];
    const maps = projects.map((ref) => getAttributeMap(repos, ref));
    const judge = { baseUrl: process.env.SPOTTER_JUDGE_BASE_URL ?? 'https://openrouter.ai/api/v1', keySet: Boolean(process.env.SPOTTER_JUDGE_API_KEY) };
    return c.html(<SettingsPage maps={maps} authSet={Boolean(process.env.SPOTTER_AUTH_TOKEN)} judge={judge} shell={shell()} />);
  });
  app.route('/judges', judgeRoutes(repos, shell));

  return app;
}

