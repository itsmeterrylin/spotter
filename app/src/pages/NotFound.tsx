import { urls } from '../urls.ts';
import { Layout } from './Layout.tsx';
import { Empty } from './ui.tsx';

type Props = { status: number; inbox: number };

export const ErrorPage = ({ status, inbox }: Props) => (
  <Layout title="Spotter" inbox={inbox}>
    <Empty icon={status === 404 ? 'search' : 'flag'} title={status === 404 ? 'Not here' : 'Bad link'} action={<a class="btn btn-primary" href={urls.inbox()}>Inbox</a>} />
  </Layout>
);
