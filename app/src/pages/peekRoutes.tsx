import { type Context, Hono } from 'hono';
import { versionNumber } from '../api/schemas.ts';
import type { Repos } from '../db/repos/index.ts';
import { urls } from '../urls.ts';
import { loadPanel, type PeekKind, type PeekRef } from './panelData.ts';
import { PeekPane } from './Peek.tsx';

const listOf: Record<PeekKind, () => string> = {
  issue: () => urls.issues(),
  trace: () => urls.traces(),
  judge: () => urls.judges(),
  version: () => urls.judges(),
  run: () => urls.runs(),
  dataset: () => urls.datasets(),
  item: () => urls.datasets(),
};

/** The peek for `?peek=` (or an alias such as `?trace=`) on a list page, and the `selected` id to mark its row. */
export function peekFromQuery(repos: Repos, c: Context, make: (id: string) => PeekRef, alias?: string): { selected: string | undefined; pane: ReturnType<typeof PeekPane> | undefined } {
  const url = new URL(c.req.url);
  const selected = url.searchParams.get('peek') ?? (alias ? url.searchParams.get(alias) : null) ?? undefined;
  url.searchParams.delete('peek');
  if (alias) url.searchParams.delete(alias);
  const closeHref = `${url.pathname}${url.searchParams.size ? `?${url.searchParams}` : ''}`;
  return { selected, pane: selected ? <PeekPane data={loadPanel(repos, make(selected))} closeHref={closeHref} /> : undefined };
}

/** `<object path>/pane` for every kind: the same fragment a list opens when a row is clicked. */
export function peekRoutes(repos: Repos): Hono {
  const app = new Hono();
  const pane = (c: Context, ref: PeekRef) => c.html(<PeekPane data={loadPanel(repos, ref)} closeHref={c.req.query('close') ?? listOf[ref.kind]()} />);
  app.get('/issues/:id/pane', (c) => pane(c, { kind: 'issue', id: c.req.param('id') }));
  app.get('/traces/:id/pane', (c) => pane(c, { kind: 'trace', id: c.req.param('id') }));
  app.get('/judges/:name/pane', (c) => pane(c, { kind: 'judge', name: c.req.param('name') }));
  app.get('/judges/:name/versions/:number/pane', (c) => pane(c, { kind: 'version', name: c.req.param('name'), number: versionNumber.parse(c.req.param('number')) }));
  app.get('/runs/:id/pane', (c) => pane(c, { kind: 'run', id: c.req.param('id') }));
  app.get('/datasets/:id/pane', (c) => pane(c, { kind: 'dataset', id: c.req.param('id') }));
  app.get('/datasets/:id/items/:item/pane', (c) => pane(c, { kind: 'item', dataset: c.req.param('id'), id: c.req.param('item') }));
  return app;
}
