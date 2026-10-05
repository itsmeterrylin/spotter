import type { Run } from '../db/repos/run.ts';
import type { Trace } from '../db/repos/trace.ts';
import type { Child } from 'hono/jsx';
import { urls } from '../urls.ts';
import type { Shell } from './data.ts';
import { Layout, type Tab } from './Layout.tsx';
import { type Crumb, Empty, Icon, pct, short, summarize, type Verdict, VerdictPill } from './ui.tsx';

export type TraceListRow = { trace: Trace; run: Run | null; values: Map<string, number>; verdict: Verdict | null };

export type TracesTab = 'all' | 'unlabeled';

type Props = {
  rows: TraceListRow[];
  names: string[];
  run: Run | null;
  score?: string;
  filters: number;
  tab: TracesTab;
  q?: string;
  query: URLSearchParams;
  limit: number;
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

const Dash = () => <span class="muted">–</span>;

const Table = ({ rows, names, score, selected }: Pick<Props, 'rows' | 'names' | 'score' | 'selected'>) => (
  <div class="card card-flush scroll-x">
    <table class="table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Run</th>
          <th>Output</th>
          {names.map((n) => (
            <th class="num" data-score={n} data-selected={n === score ? '1' : undefined}>{n}</th>
          ))}
          <th>Verdict</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ trace, run, values, verdict }) => (
          <tr class="linkrow" data-href={urls.trace(trace.id)} data-trace={trace.id} data-selected={trace.id === selected ? '1' : undefined}>
            <td>
              <div class="stack" style="--gap: 2px">
                <a class="link strong mono" href={urls.trace(trace.id)}>{short(trace.id)}</a>
                {trace.dataset_item_id ? <span class="t-caption muted mono">{short(trace.dataset_item_id)}</span> : null}
              </div>
            </td>
            <td class="run">{run ? <a class="link" href={urls.traces({ run: run.id })}>{run.name}</a> : <Dash />}</td>
            <td class="wrap">{summarize(trace.output)}</td>
            {names.map((n) => {
              const v = values.get(n);
              return <td class="num strong">{v === undefined ? <Dash /> : pct(v)}</td>;
            })}
            <td><VerdictPill verdict={verdict} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const TracesPage = ({ rows, names, run, score, filters, tab, q, query, limit, shell, selected, pane }: Props) => {
  const crumbs: Crumb[] = run ? [[urls.runs(run.dataset_id), 'Runs'], [urls.run(run.id), run.name]] : [];
  const action = run ? (
    <a class="btn btn-primary" href={urls.review({ run: run.id, filter: 'unlabeled' })}><Icon name="human" />Review unlabeled</a>
  ) : undefined;
  const meta = `${rows.length.toLocaleString('en-US')}${rows.length === limit ? '+' : ''} traces`;
  return (
    <Layout
      title="Traces"
      meta={meta}
      section="traces"
      shell={shell}
      tabs={tracesTabs(query, tab)}
      crumbs={crumbs}
      action={action}
      script="traces"
      aside={<aside class="aside aside-wide pane" id="pane" aria-label="Trace" hidden={!pane}>{pane}</aside>}
    >
      {filters || q ? (
        <div class="chips" style="margin-bottom: var(--space-16)">
          {filters ? <span class="pill pill-brand"><Icon name="filter" size="sm" />{filters} {filters === 1 ? 'filter' : 'filters'}</span> : null}
          {q ? <span class="pill pill-brand"><Icon name="search" size="sm" />{q}</span> : null}
        </div>
      ) : null}
      {rows.length ? <Table rows={rows} names={names} score={score} selected={selected} /> : <Empty icon="trace" title={q ? 'No matches' : 'No traces yet'} />}
    </Layout>
  );
};
