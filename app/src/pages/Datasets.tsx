import type { Dataset, DatasetItem } from '../db/repos/dataset.ts';
import type { Run } from '../db/repos/run.ts';
import { urls } from '../urls.ts';
import type { RunCard, Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import { RunsList, when } from './Runs.tsx';
import { Empty, Icon, IconButton, short, summarize } from './ui.tsx';

export type DatasetRow = { dataset: Dataset; items: number; runs: number; last: Run | null };

type ListProps = { rows: DatasetRow[]; shell: Shell };

export const DatasetsPage = ({ rows, shell }: ListProps) => (
  <Layout title="Datasets" section="datasets" shell={shell} script="rows">
    {rows.length ? (
      <div class="card card-flush" data-list>
        {rows.map(({ dataset, items, runs, last }) => (
          <div class="list-row" data-row>
            <Icon name="dataset" size="sm" />
            <a class="grow strong row-link" href={urls.dataset(dataset.id)}>{dataset.name}</a>
            <span class="meta num" title="Items">{items} {items === 1 ? 'item' : 'items'}</span>
            <span class="meta num" title="Runs">{runs} {runs === 1 ? 'run' : 'runs'}</span>
            {last ? (
              <>
                <a class="meta" href={urls.run(last.id)} title="Last run">{last.name}</a>
                <span class="meta num" title={last.started_at}>{when(last.started_at)}</span>
              </>
            ) : null}
          </div>
        ))}
      </div>
    ) : (
      <Empty icon="dataset" title="No datasets yet" />
    )}
  </Layout>
);

const ItemRow = ({ item }: { item: DatasetItem }) => (
  <div class="list-row" data-row={item.source_trace_id ? true : undefined}>
    <span class="id mono">{short(item.id)}</span>
    <span class="grow">{summarize(item.input)}</span>
    <span class="meta expected">{summarize(item.expected) || '–'}</span>
    {item.source_trace_id ? <a class="meta mono row-link" href={urls.trace(item.source_trace_id)} title="Source trace">{short(item.source_trace_id)}</a> : <span class="meta">–</span>}
  </div>
);

const ItemsList = ({ items }: { items: DatasetItem[] }) => (
  <div class="card card-flush" data-list>
    {items.map((item) => <ItemRow item={item} />)}
  </div>
);

type DetailProps = { dataset: Dataset; items: DatasetItem[]; cards: RunCard[]; shell: Shell };

const latestCompare = (dataset: Dataset, cards: RunCard[]) => {
  const [newest, previous] = cards;
  if (!newest || !previous) return undefined;
  return (
    <IconButton href={urls.compare(dataset.id, [previous.run.id, newest.run.id], 'changes')} icon="compare" label="Compare latest runs" />
  );
};

export const DatasetPage = ({ dataset, items, cards, shell }: DetailProps) => (
  <Layout title={dataset.name} heading section="datasets" shell={shell} crumbs={[[urls.datasets(), 'Datasets']]} actions={latestCompare(dataset, cards)} script="rows">
    <section class="group">
      <h2 class="t-content bold">Items</h2>
      {items.length ? <ItemsList items={items} /> : <Empty icon="dataset" title="No items yet" />}
    </section>
    <section class="group">
      <h2 class="t-content bold">Runs</h2>
      {cards.length ? <RunsList cards={cards} grouped={false} /> : <Empty icon="run" title="No runs yet" />}
    </section>
  </Layout>
);
