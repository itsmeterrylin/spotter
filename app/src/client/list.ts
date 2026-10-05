import './shell.ts';
import { isTyping, on } from './keys.ts';

export { isTyping };

const rowsNow = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.list-row[data-row]')];

let active: HTMLElement | null = null;

const focusListeners: Array<(row: HTMLElement) => void> = [];

/** Run `fn` each time focus lands on a row, whether from j/k, a click, or code. */
export const onFocusRow = (fn: (row: HTMLElement) => void): void => {
  focusListeners.push(fn);
};

/** The row j/k last landed on, if it is still on the page. */
export const focusedRow = (): HTMLElement | null => (active?.isConnected ? active : null);

export const hrefOf = (row: HTMLElement | null): string | undefined => row?.querySelector<HTMLAnchorElement>('a.row-link')?.href;

export function focusRow(row: HTMLElement | undefined): void {
  if (!row) return;
  active?.removeAttribute('data-focus');
  active = row;
  row.setAttribute('data-focus', '1');
  row.scrollIntoView({ block: 'nearest' });
  for (const fn of focusListeners) fn(row);
}

const step = (by: number): void => {
  const rows = rowsNow();
  if (!rows.length) return;
  const at = focusedRow() ? rows.indexOf(active as HTMLElement) : -1;
  focusRow(rows[Math.max(0, Math.min(at + by, rows.length - 1))]);
};

/** The page's own URL minus peek state: what a detail page returns to and steps through. */
const here = (): string => {
  const url = new URL(location.href);
  for (const key of ['peek', 'trace', 'from']) url.searchParams.delete(key);
  return url.pathname + (url.searchParams.size ? `?${url.searchParams}` : '');
};

/** Make every link to a full page remember the list it was opened from (`?from=`). */
export function stampFrom(root: ParentNode): void {
  const from = here();
  for (const a of root.querySelectorAll<HTMLAnchorElement>('a.row-link, a[data-open]')) {
    const url = new URL(a.href);
    if (url.origin !== location.origin) continue;
    url.searchParams.set('from', from);
    a.href = url.pathname + url.search;
  }
}

stampFrom(document);

on('list.next', () => {
  if (!rowsNow().length) return false;
  step(1);
});
on('list.prev', () => {
  if (!rowsNow().length) return false;
  step(-1);
});
on('list.open', () => {
  const href = hrefOf(focusedRow());
  if (!href) return false;
  location.href = href;
});
