import type { Dataset } from '../db/repos/dataset.ts';
import { urls } from '../urls.ts';
import type { RunCard } from './data.ts';
import { Layout } from './Layout.tsx';
import { type Crumb, Delta, Empty, Icon, pct } from './ui.tsx';

export const when = (iso: string): string => iso.slice(0, 16).replace('T', ' ');

const Dash = () => <span class="muted">–</span>;

export const RunStatus = ({ ended }: { ended: string | null }) =>
  ended ? (
    <span class="pill pill-pass"><Icon name="pass" size="sm" />Done</span>
  ) : (
    <span class="pill pill-brand"><Icon name="time" size="sm" />Running</span>
  );

export const RunsTable = ({ cards }: { cards: RunCard[] }) => (
  <div class="card card-flush scroll-x">
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Dataset</th>
          <th>Started</th>
          <th class="num">Pass rate</th>
          <th class="num">Delta</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {cards.map(({ run, dataset, primary, scores }) => {
          const s = primary ? scores[primary] : undefined;
          return (
            <tr class="linkrow" data-href={urls.run(run.id)}>
              <td class="nowrap"><a class="link strong" href={urls.run(run.id)}>{run.name}</a></td>
              <td>{dataset ? <a class="link" href={urls.dataset(dataset.id)}>{dataset.name}</a> : <Dash />}</td>
              <td class="muted num nowrap">{when(run.started_at)}</td>
              <td class="num strong">{s ? pct(s.mean) : <Dash />}</td>
              <td class="num">{s && s.diff !== null ? <Delta value={s.diff} /> : <Dash />}</td>
              <td><RunStatus ended={run.ended_at} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export const compareAction = (cards: RunCard[]) => {
  const card = cards.find((c) => c.baseline !== null);
  if (!card?.baseline) return undefined;
  return (
    <a class="btn btn-primary" href={urls.compare(card.run.dataset_id, [card.baseline.id, card.run.id], 'changes')}><Icon name="compare" />Compare</a>
  );
};

type Props = { cards: RunCard[]; dataset: Dataset | null; unread: number };

export const RunsPage = ({ cards, dataset, unread }: Props) => {
  const crumbs: Crumb[] = dataset ? [[urls.datasets(), 'Datasets'], [urls.dataset(dataset.id), dataset.name]] : [];
  return (
    <Layout title="Runs" section="runs" unread={unread} crumbs={crumbs} action={compareAction(cards)} script="rows">
      {cards.length ? <RunsTable cards={cards} /> : <Empty icon="run" title="No runs yet" />}
    </Layout>
  );
};
