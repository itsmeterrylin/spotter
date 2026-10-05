import type { Child } from 'hono/jsx';
import type { Dataset, DatasetItem } from '../db/repos/dataset.ts';
import type { Run } from '../db/repos/run.ts';
import { urls } from '../urls.ts';
import type { RunCard, Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import type { PanelData } from './panelData.ts';
import { Panel } from './panels.tsx';
import { PeekRegion, peekRow } from './Peek.tsx';
import { RunsList, when } from './Runs.tsx';
import { Empty, Icon, IconButton, short, summarize } from './ui.tsx';

export type DatasetRow = { dataset: Dataset; items: number; runs: number; last: Run | null };

type ListProps = { rows: DatasetRow[]; shell: Shell; selected?: string; pane?: Child };

export const DatasetsPage = ({ rows, shell, selected, pane }: ListProps) => (
  <Layout title="Datasets" section="datasets" shell={shell} script="rows" aside={<PeekRegion>{pane}</PeekRegion>}>
    {rows.length ? (
      <div class="card card-flush" data-list>
        {rows.map(({ dataset, items, runs, last }) => (
          <div class="list-row" data-row {...peekRow({ kind: 'dataset', id: dataset.id }, selected)}>
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

const ItemRow = ({ item, selected }: { item: DatasetItem; selected?: string }) => (
  <div class="list-row" data-row {...peekRow({ kind: 'item', dataset: item.dataset_id, id: item.id }, selected)}>
    <span class="id mono">{short(item.id)}</span>
    <span class="grow">{summarize(item.input)}</span>
    <span class="meta expected">{summarize(item.expected) || '–'}</span>
    {item.source_trace_id ? <a class="meta mono row-link" href={urls.trace(item.source_trace_id)} title="Source trace">{short(item.source_trace_id)}</a> : <span class="meta">–</span>}
  </div>
);

const ItemsList = ({ items, selected }: { items: DatasetItem[]; selected?: string }) => (
  <div class="card card-flush" data-list>
    {items.map((item) => <ItemRow item={item} selected={selected} />)}
  </div>
);

type DetailProps = { data: Extract<PanelData, { kind: 'dataset' }>; items: DatasetItem[]; shell: Shell; selected?: string; pane?: Child };

const latestCompare = (dataset: Dataset, cards: RunCard[]) => {
  const [newest, previous] = cards;
  if (!newest || !previous) return undefined;
  return (
    <IconButton href={urls.compare(dataset.id, [previous.run.id, newest.run.id], 'changes')} icon="compare" label="Compare latest runs" />
  );
};

export const DatasetPage = ({ data, items, shell, selected, pane }: DetailProps) => {
  const { dataset, cards } = data;
  return (
    <Layout
      title={dataset.name}
      heading
      section="datasets"
      shell={shell}
      crumbs={[[urls.datasets(), 'Datasets']]}
      actions={latestCompare(dataset, cards)}
      script="rows"
      aside={
        <>
          <aside class="aside" aria-label="Dataset"><Panel data={data} /></aside>
          <PeekRegion>{pane}</PeekRegion>
        </>
      }
    >
      <section class="group">
        <h2 class="t-content bold">Items</h2>
        {items.length ? <ItemsList items={items} selected={selected} /> : <Empty icon="dataset" title="No items yet" />}
      </section>
      <section class="group">
        <h2 class="t-content bold">Runs</h2>
        {cards.length ? <RunsList cards={cards} grouped={false} selected={selected} /> : <Empty icon="run" title="No runs yet" />}
      </section>
    </Layout>
  );
};
