import type { Dataset } from '../db/repos/dataset.ts';
import { urls } from '../urls.ts';
import type { RunCard } from './data.ts';
import { Layout } from './Layout.tsx';
import { Crumbs, Delta, Empty, Icon, pct } from './ui.tsx';

export const when = (iso: string): string => iso.slice(0, 16).replace('T', ' ');

export const RunRows = ({ cards }: { cards: RunCard[] }) => (
  <div class="card card-flush">
    {cards.map(({ run, primary, scores }) => {
      const s = primary ? scores[primary] : undefined;
      return (
        <div class="row">
          <Icon name="run" />
          <div class="grow">
            <a class="link" href={urls.run(run.id)}>{run.name}</a> <span class="muted num">· {when(run.started_at)}</span>
          </div>
          {s ? <span class="num strong">{pct(s.mean)}</span> : null}
          {s ? <Delta value={s.diff} /> : null}
        </div>
      );
    })}
  </div>
);

type Props = { cards: RunCard[]; dataset: Dataset | null; inbox: number };

export const RunsPage = ({ cards, dataset, inbox }: Props) => (
  <Layout title="Spotter Runs" inbox={inbox}>
    <Crumbs items={[]} />
    <div class="page-head">
      <h1 class="t-title heavy">Runs</h1>
      {dataset ? (
        <span class="pill pill-brand"><Icon name="dataset" size="sm" />{dataset.name}</span>
      ) : null}
    </div>
    {cards.length ? <RunRows cards={cards} /> : <Empty icon="run" title="No runs yet" />}
  </Layout>
);
