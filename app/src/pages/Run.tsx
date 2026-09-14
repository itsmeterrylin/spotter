import type { Trace } from '../db/repos/trace.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict, RunCard } from './data.ts';
import { Layout } from './Layout.tsx';
import { Crumbs, Delta, Empty, Icon, pct, short, summarize, VerdictPill } from './ui.tsx';

export type TraceRow = { trace: Trace; verdict: HumanVerdict | null; value: number | null };

type Props = { card: RunCard; rows: TraceRow[]; inbox: number };

const rowIcon = (value: number | null): 'pass' | 'fail' | 'trace' => (value === 1 ? 'pass' : value === 0 ? 'fail' : 'trace');

export const RunPage = ({ card, rows, inbox }: Props) => {
  const { run, baseline, scores, primary, unlabeled, regressed } = card;
  const compareUrl = baseline ? urls.compare(run.dataset_id, [baseline.id, run.id], 'changes') : null;
  return (
    <Layout title={`Spotter · ${run.name}`} inbox={inbox}>
      <Crumbs items={[[urls.runs(run.dataset_id), 'Runs']]} />
      <div class="page-head">
        <h1 class="t-title heavy">{run.name}</h1>
        {baseline && compareUrl ? (
          <a class="btn btn-primary" href={compareUrl}><Icon name="compare" />Compare with {baseline.name}</a>
        ) : null}
      </div>
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
            {regressed.length ? <a class="link t-caption" href={compareUrl}>See them</a> : null}
          </div>
        ) : null}
      </div>
      {rows.length ? (
        <div class="card card-flush">
          {rows.map(({ trace, verdict, value }) => (
            <div class="row">
              <Icon name={rowIcon(value)} />
              <div class="grow">
                <a class="link mono" href={urls.trace(trace.id)}>{short(trace.id)}</a> <span class="muted">{summarize(trace.output)}</span>
              </div>
              {value !== null ? <span class="num strong">{pct(value)}</span> : null}
              <VerdictPill verdict={verdict?.verdict ?? null} />
            </div>
          ))}
        </div>
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
