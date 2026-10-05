import type { Child } from 'hono/jsx';
import type { Dataset } from '../db/repos/dataset.ts';
import { urls } from '../urls.ts';
import type { RunCard, Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import { PeekRegion, peekRow } from './Peek.tsx';
import { type Crumb, Delta, Empty, Icon, IconButton, pct } from './ui.tsx';

export const when = (iso: string): string => iso.slice(0, 16).replace('T', ' ');

const Dash = () => <span class="muted">–</span>;

export const RunStatus = ({ ended }: { ended: string | null }) =>
  ended ? (
    <span class="meta"><Icon name="pass" size="sm" />Done</span>
  ) : (
    <span class="meta"><Icon name="time" size="sm" />Running</span>
  );

const RunRow = ({ card: { run, primary, scores }, selected }: { card: RunCard; selected?: string }) => {
  const s = primary ? scores[primary] : undefined;
  return (
    <div class="list-row" data-row {...peekRow({ kind: 'run', id: run.id }, selected)}>
      <a class="grow strong row-link" href={urls.run(run.id)}>{run.name}</a>
      {s ? <span class="num strong">{pct(s.mean)}</span> : <Dash />}
      {s && s.diff !== null ? <Delta value={s.diff} /> : null}
      <RunStatus ended={run.ended_at} />
      <span class="meta num" title={run.started_at}>{when(run.started_at)}</span>
    </div>
  );
};

/** Runs as 44px rows. Grouped by dataset on the runs list; a dataset page passes `grouped={false}`. */
export const RunsList = ({ cards, grouped = true, selected }: { cards: RunCard[]; grouped?: boolean; selected?: string }) => {
  const datasets = grouped ? [...new Map(cards.map((c) => [c.run.dataset_id, c.dataset])).entries()] : [];
  return (
    <div class="card card-flush" data-list>
      {grouped
        ? datasets.map(([id, dataset]) => {
            const rows = cards.filter((c) => c.run.dataset_id === id);
            return (
              <>
                <div class="group-head">
                  <Icon name="dataset" size="sm" />
                  {dataset ? <a class="link link-title" href={urls.dataset(dataset.id)}>{dataset.name}</a> : 'No dataset'}
                  <span class="count">{rows.length}</span>
                </div>
                {rows.map((card) => <RunRow card={card} selected={selected} />)}
              </>
            );
          })
        : cards.map((card) => <RunRow card={card} selected={selected} />)}
    </div>
  );
};

export const compareAction = (cards: RunCard[]) => {
  const card = cards.find((c) => c.baseline !== null);
  if (!card?.baseline) return undefined;
  return (
    <IconButton href={urls.compare(card.run.dataset_id, [card.baseline.id, card.run.id], 'changes')} icon="compare" label="Compare with baseline" />
  );
};

type Props = { cards: RunCard[]; dataset: Dataset | null; shell: Shell; selected?: string; pane?: Child };

export const RunsPage = ({ cards, dataset, shell, selected, pane }: Props) => {
  const crumbs: Crumb[] = dataset ? [[urls.datasets(), 'Datasets'], [urls.dataset(dataset.id), dataset.name]] : [];
  return (
    <Layout title="Runs" section="runs" shell={shell} crumbs={crumbs} actions={compareAction(cards)} script="rows" aside={<PeekRegion>{pane}</PeekRegion>}>
      {cards.length ? <RunsList cards={cards} selected={selected} /> : <Empty icon="run" title="No runs yet" />}
    </Layout>
  );
};
