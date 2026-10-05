import { urls } from '../urls.ts';
import type { Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import { Empty } from './ui.tsx';

type Props = { status: number; shell: Shell };

export const ErrorPage = ({ status, shell }: Props) => {
  const title = status === 404 ? 'Not here' : 'Bad link';
  return (
    <Layout title={title} section={null} shell={shell}>
      <Empty icon={status === 404 ? 'search' : 'flag'} title={title} action={<a class="btn btn-primary" href={urls.runs()}>Runs</a>} />
    </Layout>
  );
};
