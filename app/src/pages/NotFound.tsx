import { ApiError } from '../errors.ts';
import { urls } from '../urls.ts';
import type { Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import { Empty } from './ui.tsx';

export type ErrorAction = { href: string; label: string };

/** What an error page says: the title names what was missing, the detail is optional, the action leads to the parent list. */
export type ErrorView = { status: number; title: string; detail?: string; action: ErrorAction };

const lists: Array<[prefix: string, action: ErrorAction]> = [
  ['trace', { href: urls.traces(), label: 'Traces' }],
  ['run', { href: urls.runs(), label: 'Runs' }],
  ['dataset', { href: urls.datasets(), label: 'Datasets' }],
  ['judge', { href: urls.judges(), label: 'Judges' }],
  ['issue', { href: urls.home(), label: 'Issues' }],
  ['project', { href: urls.home(), label: 'Issues' }],
];

const parentList = (what: string): ErrorAction => lists.find(([prefix]) => what.startsWith(prefix))?.[1] ?? { href: urls.home(), label: 'Issues' };

export const missingObject = (what: string, id: string): ErrorView => ({
  status: 404,
  title: `No ${what} ${id}`,
  detail: 'It was deleted, or the link is wrong.',
  action: parentList(what),
});

export const missingPage = (path: string): ErrorView => ({ status: 404, title: 'Page not found', detail: path, action: { href: urls.home(), label: 'Issues' } });

export const badLink: ErrorView = { status: 400, title: 'Bad link', detail: 'A value in the address is not valid.', action: { href: urls.home(), label: 'Issues' } };

export const compareNeedsTwo = (dataset: { id: string; name: string }): ErrorView => ({
  status: 400,
  title: `Compare needs at least two runs in dataset ${dataset.name}`,
  action: { href: urls.dataset(dataset.id), label: `Back to ${dataset.name}` },
});

export const viewOf = (err: unknown): ErrorView | null => {
  if (err instanceof ApiError) return err.subject ? missingObject(err.subject.what, err.subject.id) : { status: err.status, title: err.status === 404 ? 'Not found' : 'Bad link', detail: err.message, action: { href: urls.home(), label: 'Issues' } };
  return null;
};

export const ErrorPage = ({ view, shell }: { view: ErrorView; shell: Shell }) => (
  <Layout title={view.title} section={null} shell={shell}>
    <Empty icon={view.status === 404 ? 'search' : 'flag'} title={view.detail ?? ''} action={<a class="btn btn-primary" href={view.action.href}>{view.action.label}</a>} />
  </Layout>
);
