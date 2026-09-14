import type { Run } from '../db/repos/run.ts';
import type { Trace } from '../db/repos/trace.ts';
import type { Child } from 'hono/jsx';
import { urls } from '../urls.ts';
import { Layout } from './Layout.tsx';
import { type Crumb, Empty, Icon, pct, short, summarize, type Verdict, VerdictPill } from './ui.tsx';

export type TraceListRow = { trace: Trace; run: Run | null; values: Map<string, number>; verdict: Verdict | null };

type Props = { rows: TraceListRow[]; names: string[]; run: Run | null; score?: string; filters: number; unread: number; selected?: string; pane?: Child };

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
            <td>{run ? <a class="link" href={urls.traces({ run: run.id })}>{run.name}</a> : <Dash />}</td>
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

export const TracesPage = ({ rows, names, run, score, filters, unread, selected, pane }: Props) => {
  const crumbs: Crumb[] = run ? [[urls.runs(run.dataset_id), 'Runs'], [urls.run(run.id), run.name]] : [];
  const action = run ? (
    <a class="btn btn-primary" href={urls.review({ run: run.id, filter: 'unlabeled' })}><Icon name="human" />Review unlabeled</a>
  ) : undefined;
  return (
    <Layout title="Traces" section="traces" unread={unread} crumbs={crumbs} action={action} script="traces">
      {filters ? (
        <div class="chips" style="margin-bottom: var(--space-16)">
          <span class="pill pill-brand"><Icon name="filter" size="sm" />{filters} {filters === 1 ? 'filter' : 'filters'}</span>
        </div>
      ) : null}
      <div class="split" data-pane={pane ? '1' : undefined}>
        {rows.length ? <Table rows={rows} names={names} score={score} selected={selected} /> : <Empty icon="trace" title="No traces yet" />}
        <aside class="pane card" id="pane" aria-label="Trace" hidden={!pane}>{pane}</aside>
      </div>
    </Layout>
  );
};
