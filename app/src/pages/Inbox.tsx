import type { InboxItem, RunCard } from './data.ts';
import { Layout } from './Layout.tsx';
import { RunRows } from './Runs.tsx';
import { Empty, Icon } from './ui.tsx';

type Props = { items: InboxItem[]; cards: RunCard[]; inbox: number };

export const InboxPage = ({ items, cards, inbox }: Props) => (
  <Layout title="Spotter Inbox" inbox={inbox}>
    <div class="page-head">
      <h1 class="t-title heavy">Inbox</h1>
    </div>
    <section class="group">
      <h2 class="t-caption muted">Waiting on you</h2>
      {items.length ? (
        <div class="card card-flush">
          {items.map((i) => (
            <div class="row">
              <Icon name={i.icon} />
              <div class="grow">
                <span class="strong num">{i.count}</span> {i.label}
              </div>
              <a class="btn btn-primary btn-compact" href={i.href}>{i.cta}</a>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon="pass" title="All clear" />
      )}
    </section>
    <section class="group">
      <h2 class="t-caption muted">Runs</h2>
      {cards.length ? <RunRows cards={cards} /> : <Empty icon="run" title="No runs yet" />}
    </section>
  </Layout>
);
