import { type Context, Hono } from 'hono';
import { filterList } from '../api/schemas.ts';
import type { Repos } from '../db/repos/index.ts';
import { notFound } from '../errors.ts';
import type { Filter } from '../services/filters.ts';
import { notifications } from '../services/notifications.ts';
import { counts, rollup } from '../services/rollup.ts';
import { getTrace, listTraces } from '../services/traces.ts';
import { urls } from '../urls.ts';
import { humanVerdict, runCard, type Shell } from './data.ts';
import { DatasetsPage, DatasetPage, type DatasetRow } from './Datasets.tsx';
import { NotificationsPage } from './Notifications.tsx';
import { RunsPage } from './Runs.tsx';
import { type TraceListRow, TracesPage, type TracesTab } from './Traces.tsx';
import { TracePane } from './Trace.tsx';

const traceLimit = 200;
const unlabeledFilter: Filter = { field: 'source', operator: '!=', value: 'human' };

export function listRoutes(repos: Repos, shell: () => Shell): Hono {
  const app = new Hono();

  const runs = (c: Context) => {
    const datasetId = c.req.query('dataset');
    const dataset = datasetId ? repos.datasets.get(datasetId) : null;
    if (datasetId && !dataset) throw notFound('dataset', datasetId);
    const cards = repos.runs.list(datasetId).map((r) => runCard(repos, r));
    return c.html(<RunsPage cards={cards} dataset={dataset} shell={shell()} />);
  };
  app.get('/runs', runs);
  app.get('/inbox', (c) => c.redirect(urls.notifications(), 301));

  app.get('/datasets', (c) => {
    const rows: DatasetRow[] = repos.datasets.list().map((dataset) => {
      const runs = repos.runs.list(dataset.id);
      return { dataset, items: repos.datasets.countItems(dataset.id), runs: runs.length, last: runs[0] ?? null };
    });
    return c.html(<DatasetsPage rows={rows} shell={shell()} />);
  });

  app.get('/datasets/:id', (c) => {
    const id = c.req.param('id');
    const dataset = repos.datasets.get(id);
    if (!dataset) throw notFound('dataset', id);
    const cards = repos.runs.list(id).map((r) => runCard(repos, r));
    return c.html(<DatasetPage dataset={dataset} items={repos.datasets.listItems(id)} cards={cards} shell={shell()} />);
  });

  app.get('/datasets/:id/items', (c) => c.redirect(urls.dataset(c.req.param('id')), 301));

  app.get('/traces', (c) => {
    const runId = c.req.query('run') ?? c.req.query('run_id');
    const run = runId ? repos.runs.get(runId) : null;
    if (runId && !run) throw notFound('run', runId);
    const filters = filterList.parse(c.req.query('filter') ?? c.req.query('filters'));
    const tab: TracesTab = c.req.query('tab') === 'unlabeled' ? 'unlabeled' : 'all';
    const q = c.req.query('q')?.trim() || undefined;
    const scoped: Filter[] = [...filters, ...(tab === 'unlabeled' ? [unlabeledFilter] : []), ...(q ? [{ field: 'text', operator: 'contains' as const, value: q }] : [])];
    const page = listTraces(repos, { filters: scoped, run_id: runId, limit: traceLimit });
    const rows: TraceListRow[] = page.traces.map((trace) => ({
      trace,
      run: trace.run_id ? repos.runs.get(trace.run_id) : null,
      values: rollup(counts(repos, trace.scores)),
      verdict: humanVerdict(trace.scores)?.verdict ?? null,
    }));
    const names = [...new Set(rows.flatMap((r) => [...r.values.keys()]))].sort();
    const selected = c.req.query('trace');
    const query = new URL(c.req.url).searchParams;
    query.delete('trace');
    const closeHref = `${urls.traces()}${query.size ? `?${query}` : ''}`;
    const pane = selected
      ? (() => {
          const t = getTrace(repos, selected);
          return <TracePane trace={t} run={t.run_id ? repos.runs.get(t.run_id) : null} verdict={humanVerdict(t.scores)} closeHref={closeHref} />;
        })()
      : undefined;
    return c.html(<TracesPage rows={rows} names={names} run={run} score={c.req.query('score')} filters={filters.length} tab={tab} q={q} query={query} limit={traceLimit} shell={shell()} selected={selected} pane={pane} />);
  });

  app.get('/notifications', (c) => {
    const items = notifications(repos);
    return c.html(<NotificationsPage items={items} shell={shell()} />);
  });

  return app;
}
