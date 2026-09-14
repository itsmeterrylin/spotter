import type { IconName } from '../../../design-system/src/icons.ts';
import type { Notification, NotificationKind } from '../services/notifications.ts';
import { Layout } from './Layout.tsx';
import { Empty, Icon } from './ui.tsx';

const icons: Record<NotificationKind, IconName> = { regression: 'down', unlabeled: 'human', disagreement: 'judge', labels: 'human', completed: 'pass' };

type Props = { items: Notification[]; unread: number };

export const NotificationsPage = ({ items, unread }: Props) => (
  <Layout title="Notifications" section="notifications" unread={unread}>
    {items.length ? (
      <div class="card card-flush">
        {items.map((n) => (
          <div class="row" data-kind={n.kind}>
            <Icon name={icons[n.kind]} />
            <div class="grow">
              <span class="strong num">{n.count}</span> {n.title} <span class="muted">· {n.detail}</span>
            </div>
            <a class="btn btn-primary btn-compact" href={n.url}>{n.action}</a>
          </div>
        ))}
      </div>
    ) : (
      <Empty icon="pass" title="All clear" />
    )}
  </Layout>
);
