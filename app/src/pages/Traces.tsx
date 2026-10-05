import type { Run } from '../db/repos/run.ts';
import type { Trace } from '../db/repos/trace.ts';
import type { Child } from 'hono/jsx';
import { urls } from '../urls.ts';
import type { Shell } from './data.ts';
import { Layout, type Tab } from './Layout.tsx';
import { TraceList } from './TraceList.tsx';
import { type Crumb, Empty, Icon, IconButton, type Verdict } from './ui.tsx';

export type TraceListRow = { trace: Trace; run: Run | null; values: Map<string, number>; verdict: Verdict | null };

export type TracesTab = 'all' | 'unlabeled';

type Props = {
  rows: TraceListRow[];
  run: Run | null;
  filters: number;
  tab: TracesTab;
  q?: string;
  query: URLSearchParams;
  shell: Shell;
  selected?: string;
  pane?: Child;
};

const tabHref = (query: URLSearchParams, tab: TracesTab): string => {
  const next = new URLSearchParams(query);
  if (tab === 'all') next.delete('tab');
  else next.set('tab', tab);
  return `${urls.traces()}${next.size ? `?${next}` : ''}`;
};

const tracesTabs = (query: URLSearchParams, tab: TracesTab): Tab[] => [
  { href: tabHref(query, 'all'), label: 'All', current: tab === 'all' },
  { href: tabHref(query, 'unlabeled'), label: 'Unlabeled', current: tab === 'unlabeled' },
];

export const TracesPage = ({ rows, run, filters, tab, q, query, shell, selected, pane }: Props) => {
  const crumbs: Crumb[] = run ? [[urls.runs(run.dataset_id), 'Runs'], [urls.run(run.id), run.name]] : [];
  const action = run ? <IconButton href={urls.review({ run: run.id, filter: 'unlabeled' })} icon="human" label="Review unlabeled" /> : undefined;
  return (
    <Layout
      title="Traces"
      section="traces"
      shell={shell}
      tabs={tracesTabs(query, tab)}
      crumbs={crumbs}
      actions={action}
      script="traces"
      aside={<aside class="aside aside-wide pane" id="pane" aria-label="Trace" hidden={!pane}>{pane}</aside>}
    >
      {filters || q ? (
        <div class="chips" style="margin-bottom: var(--space-16)">
          {filters ? <span class="pill"><Icon name="filter" size="sm" />{filters} {filters === 1 ? 'filter' : 'filters'}</span> : null}
          {q ? <span class="pill"><Icon name="search" size="sm" />{q}</span> : null}
        </div>
      ) : null}
      {rows.length ? <TraceList items={rows.map(({ trace, run: r, values, verdict }) => ({ trace, verdict, run: r, scores: [...values.entries()].sort(([a], [b]) => a.localeCompare(b)) }))} selected={selected} /> : <Empty icon="trace" title={q ? 'No matches' : 'No traces yet'} />}
    </Layout>
  );
};
