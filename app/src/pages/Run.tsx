import type { Trace } from '../db/repos/trace.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict, RunCard, Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import { TraceList } from './TraceList.tsx';
import { Delta, Empty, Icon, IconButton, pct } from './ui.tsx';

export type TraceRow = { trace: Trace; verdict: HumanVerdict | null; value: number | null };

type Props = { card: RunCard; rows: TraceRow[]; shell: Shell };

export const RunPage = ({ card, rows, shell }: Props) => {
  const { run, baseline, scores, primary, unlabeled, regressed } = card;
  const compareUrl = baseline ? urls.compare(run.dataset_id, [baseline.id, run.id], 'changes') : null;
  const action = baseline && compareUrl ? <IconButton href={compareUrl} icon="compare" label={`Compare with ${baseline.name}`} /> : undefined;
  return (
    <Layout title={run.name} heading section="runs" shell={shell} crumbs={[[urls.runs(run.dataset_id), 'Runs']]} actions={action} script="rows">
      <div class="stats">
        {Object.entries(scores).map(([name, s]) => (
          <a class="card stat" href={urls.run(run.id, name)} data-selected={name === primary ? '1' : undefined}>
            <span class="label"><Icon name="score" size="sm" />{name}</span>
            <span class="t-stat num">{pct(s.mean)}</span>
            <Delta value={s.diff} />
          </a>
        ))}
        <div class="card stat">
          <span class="label"><Icon name="dataset" size="sm" />Items</span>
          <span class="t-stat num">{rows.length}</span>
        </div>
        {baseline && compareUrl ? (
          <div class="card stat">
            <span class="label"><Icon name="flag" size="sm" />Regressions</span>
            <span class="t-stat num">{regressed.length}</span>
            {regressed.length ? <a class="link t-meta" href={compareUrl}>See them</a> : null}
          </div>
        ) : null}
      </div>
      {rows.length ? (
        <TraceList items={rows.map(({ trace, verdict, value }) => ({ trace, verdict: verdict?.verdict ?? null, run: null, scores: primary && value !== null ? [[primary, value]] : [] }))} />
      ) : (
        <Empty icon="trace" title="No traces yet" />
      )}
      {unlabeled ? (
        <p style="margin-top: var(--space-16)">
          <a class="btn btn-secondary" href={urls.review({ run: run.id, filter: 'unlabeled' })}><Icon name="human" />Review {unlabeled} unlabeled</a>
        </p>
      ) : null}
    </Layout>
  );
};
