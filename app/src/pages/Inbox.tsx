import { raw } from 'hono/html';
import { icon } from '../../../design-system/src/icons.ts';
import { Layout } from './Layout.tsx';

export const InboxPage = () => (
  <Layout title="Spotter Inbox">
    <div class="page-head">
      <h1 class="t-title heavy">Inbox</h1>
    </div>
    <div class="card empty">
      {raw(icon('run', 'lg'))}
      <span class="t-title">No runs yet</span>
    </div>
  </Layout>
);
