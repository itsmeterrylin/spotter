import type { Dataset, DatasetItem } from '../db/repos/dataset.ts';
import type { Run } from '../db/repos/run.ts';
import { urls } from '../urls.ts';
import type { RunCard } from './data.ts';
import { Layout } from './Layout.tsx';
import { RunsTable, when } from './Runs.tsx';
import { Empty, Icon, short, summarize } from './ui.tsx';

export type DatasetRow = { dataset: Dataset; items: number; runs: number; last: Run | null };

type ListProps = { rows: DatasetRow[]; unread: number };

export const DatasetsPage = ({ rows, unread }: ListProps) => (
  <Layout title="Datasets" section="datasets" unread={unread} script="rows">
    {rows.length ? (
      <div class="card card-flush scroll-x">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th class="num">Items</th>
              <th class="num">Runs</th>
              <th>Last run</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ dataset, items, runs, last }) => (
              <tr class="linkrow" data-href={urls.dataset(dataset.id)}>
                <td class="nowrap"><a class="link strong" href={urls.dataset(dataset.id)}>{dataset.name}</a></td>
                <td class="num">{items}</td>
                <td class="num">{runs}</td>
                <td>
                  {last ? (
                    <>
                      <a class="link" href={urls.run(last.id)}>{last.name}</a> <span class="muted num">· {when(last.started_at)}</span>
                    </>
                  ) : (
                    <span class="muted">–</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty icon="dataset" title="No datasets yet" />
    )}
  </Layout>
);

const ItemsTable = ({ items }: { items: DatasetItem[] }) => (
  <div class="card card-flush scroll-x">
    <table class="table">
      <thead>
        <tr>
          <th>Id</th>
          <th>Input</th>
          <th>Expected</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr>
            <td class="mono strong">{short(item.id)}</td>
            <td class="wrap">{summarize(item.input)}</td>
            <td class="wrap">{summarize(item.expected)}</td>
            <td>{item.source_trace_id ? <a class="link mono" href={urls.trace(item.source_trace_id)}>{short(item.source_trace_id)}</a> : <span class="muted">–</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

type DetailProps = { dataset: Dataset; items: DatasetItem[]; cards: RunCard[]; unread: number };

const latestCompare = (dataset: Dataset, cards: RunCard[]) => {
  const [newest, previous] = cards;
  if (!newest || !previous) return undefined;
  return (
    <a class="btn btn-primary" href={urls.compare(dataset.id, [previous.run.id, newest.run.id], 'changes')}><Icon name="compare" />Compare latest</a>
  );
};

export const DatasetPage = ({ dataset, items, cards, unread }: DetailProps) => (
  <Layout title={dataset.name} section="datasets" unread={unread} crumbs={[[urls.datasets(), 'Datasets']]} action={latestCompare(dataset, cards)} script="rows">
    <section class="group">
      <h2 class="t-caption muted">Items</h2>
      {items.length ? <ItemsTable items={items} /> : <Empty icon="dataset" title="No items yet" />}
    </section>
    <section class="group">
      <h2 class="t-caption muted">Runs</h2>
      {cards.length ? <RunsTable cards={cards} /> : <Empty icon="run" title="No runs yet" />}
    </section>
  </Layout>
);
