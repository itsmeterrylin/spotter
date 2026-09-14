import { type Context, Hono } from 'hono';
import { ZodError } from 'zod';
import { versionNumber } from '../api/schemas.ts';
import type { Repos } from '../db/repos/index.ts';
import { ApiError, notFound } from '../errors.ts';
import { compare } from '../services/compare.ts';
import { getDataset } from '../services/datasets.ts';
import { counts, rollup } from '../services/rollup.ts';
import { getTrace } from '../services/traces.ts';
import { urls } from '../urls.ts';
import { clientBundle, favicon, pagesCss } from './assets.ts';
import { ComparePage } from './Compare.tsx';
import { humanVerdict, inboxItems, judgeSaid, neighbors, primaryScore, queue, runCard, type Queue } from './data.ts';
import { InboxPage } from './Inbox.tsx';
import { judgeRoutes } from './judgeRoutes.tsx';
import { ErrorPage } from './NotFound.tsx';
import { ReviewEmpty, ReviewPage } from './Review.tsx';
import { RunPage, type TraceRow } from './Run.tsx';
import { RunsPage } from './Runs.tsx';
import { TracePage } from './Trace.tsx';

const defaultFilter = 'unlabeled';

const reviewUrl = (traceId: string, q: Queue): string =>
  urls.reviewTrace(traceId, { run: q.run?.id, filter: q.filter === defaultFilter ? undefined : q.filter, judge: q.judge?.name, version: q.judge?.version });

const versionOf = (raw: string | undefined): number | undefined => (raw === undefined ? undefined : versionNumber.parse(raw));

export function createPages(repos: Repos): Hono {
  const app = new Hono();
  const inbox = (): number => inboxItems(repos).length;
  const runOrThrow = (id: string) => {
    const run = repos.runs.get(id);
    if (!run) throw notFound('run', id);
    return run;
  };

  app.onError((err, c) => {
    if (err instanceof ApiError) return c.html(<ErrorPage status={err.status} inbox={inbox()} />, err.status);
    if (err instanceof ZodError) return c.html(<ErrorPage status={400} inbox={inbox()} />, 400);
    throw err;
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

  const home = (c: Context) => {
    const items = inboxItems(repos);
    const cards = repos.runs.list().map((r) => runCard(repos, r));
    return c.html(<InboxPage items={items} cards={cards} inbox={items.length} />);
  };
  app.get('/', home);
  app.get('/inbox', home);

  app.get('/runs', (c) => {
    const datasetId = c.req.query('dataset');
    const dataset = datasetId ? repos.datasets.get(datasetId) : null;
    if (datasetId && !dataset) throw notFound('dataset', datasetId);
    const cards = repos.runs.list(datasetId).map((r) => runCard(repos, r));
    return c.html(<RunsPage cards={cards} dataset={dataset} inbox={inbox()} />);
  });

  app.get('/runs/:id', (c) => {
    const run = runOrThrow(c.req.param('id'));
    const card = runCard(repos, run, c.req.query('score'));
    const rows: TraceRow[] = repos.traces.listByRun(run.id).map((trace) => {
      const scores = repos.scores.listByTrace(trace.id);
      const values = rollup(counts(repos, scores));
      return { trace, verdict: humanVerdict(scores), value: card.primary ? (values.get(card.primary) ?? null) : null };
    });
    return c.html(<RunPage card={card} rows={rows} inbox={inbox()} />);
  });

  app.get('/datasets/:id/compare', (c) => {
    const id = c.req.param('id');
    const runs = (c.req.query('runs') ?? '').split(',').filter(Boolean);
    const only = c.req.query('only') === 'changes';
    const comparison = compare(repos, id, runs, only ? 'changes' : undefined);
    return c.html(<ComparePage comparison={comparison} dataset={getDataset(repos, id)} only={only} score={c.req.query('score')} inbox={inbox()} />);
  });

  app.get('/traces/:id', (c) => {
    const trace = getTrace(repos, c.req.param('id'));
    const run = trace.run_id ? repos.runs.get(trace.run_id) : null;
    const turnParam = c.req.query('turn');
    const turn = turnParam === undefined || Number.isNaN(Number(turnParam)) ? undefined : Number(turnParam);
    return c.html(<TracePage trace={trace} run={run} verdict={humanVerdict(trace.scores)} turn={turn} inbox={inbox()} />);
  });

  app.get('/review', (c) => {
    const filter = c.req.query('filter') ?? defaultFilter;
    const runId = c.req.query('run');
    if (runId) runOrThrow(runId);
    const q = queue(repos, { run: runId, filter, judge: c.req.query('judge'), version: versionOf(c.req.query('version')) });
    const first = q.ids[0];
    if (!first || (!q.run && !q.judge)) return c.html(<ReviewEmpty inbox={inbox()} />);
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
        inbox={inbox()}
      />,
    );
  });

  app.route('/judges', judgeRoutes(repos, inbox));

  return app;
}

