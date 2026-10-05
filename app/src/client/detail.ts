import './shell.ts';
import { on, viewOf } from './keys.ts';

const sameOrigin = (path: string | null | undefined): string | null => {
  if (!path) return null;
  try {
    const url = new URL(path, location.origin);
    return url.origin === location.origin ? url.pathname + url.search : null;
  } catch {
    return null;
  }
};

/** The list this page was opened from (`?from=`), else the page's default list. */
export const listUrl = (): string | null => sameOrigin(new URL(location.href).searchParams.get('from')) ?? sameOrigin(document.body.dataset.back);

on('back', () => {
  const list = listUrl();
  if (!list) return false;
  location.href = list;
});

/** Open the neighbor of this object in the list it came from. Stays put at either end or when the object is not in the list. */
async function step(by: 1 | -1): Promise<void> {
  const list = listUrl();
  if (!list) return;
  const res = await fetch(list, { headers: { accept: 'text/html' } });
  if (!res.ok) return;
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  const paths = [...doc.querySelectorAll<HTMLAnchorElement>('.list-row[data-row] a.row-link')].map((a) => new URL(a.getAttribute('href') ?? '', location.origin).pathname);
  const unique = [...new Set(paths)];
  const at = unique.indexOf(location.pathname);
  const next = unique[at + by];
  if (at < 0 || !next) return;
  location.href = `${next}?${new URLSearchParams({ from: list })}`;
}

if (viewOf() === 'detail') {
  on('object.next', () => void step(1));
  on('object.prev', () => void step(-1));
}
