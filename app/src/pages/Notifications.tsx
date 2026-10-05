import type { IconName } from '../../../design-system/src/icons.ts';
import type { Notification, NotificationKind } from '../services/notifications.ts';
import type { Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import { Empty, Icon } from './ui.tsx';

const icons: Record<NotificationKind, IconName> = { regression: 'down', unlabeled: 'human', disagreement: 'judge', labels: 'human', completed: 'pass' };

type Props = { items: Notification[]; shell: Shell };

export const NotificationsPage = ({ items, shell }: Props) => (
  <Layout title="Notifications" section="notifications" shell={shell} script="rows">
    {items.length ? (
      <div class="card card-flush" data-list>
        {items.map((n) => (
          <div class="list-row" data-row data-kind={n.kind}>
            <Icon name={icons[n.kind]} size="sm" />
            <span class="grow">
              <span class="strong num">{n.count}</span> {n.title} <span class="muted">· {n.detail}</span>
            </span>
            <a class="meta row-link" href={n.url}>{n.action}</a>
          </div>
        ))}
      </div>
    ) : (
      <Empty icon="pass" title="All clear" />
    )}
  </Layout>
);
