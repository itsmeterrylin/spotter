import { urls } from '../urls.ts';
import { Layout } from './Layout.tsx';
import { Empty } from './ui.tsx';

type Props = { status: number; unread: number };

export const ErrorPage = ({ status, unread }: Props) => {
  const title = status === 404 ? 'Not here' : 'Bad link';
  return (
    <Layout title={title} section={null} unread={unread}>
      <Empty icon={status === 404 ? 'search' : 'flag'} title={title} action={<a class="btn btn-primary" href={urls.runs()}>Runs</a>} />
    </Layout>
  );
};
