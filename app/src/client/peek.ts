import { focusedRow, focusRow, onFocusRow, stampFrom } from './list.ts';
import { on } from './keys.ts';

const pane = document.getElementById('pane');

const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.list-row[data-peek]')];

const peeked = (): HTMLElement | undefined => rows().find((r) => r.hasAttribute('data-peeked'));

const idInUrl = (): string | null => {
  const q = new URL(location.href).searchParams;
  return q.get('peek') ?? q.get('trace');
};

const withPeek = (id: string | null): string => {
  const url = new URL(location.href);
  url.searchParams.delete('trace');
  if (id) url.searchParams.set('peek', id);
  else url.searchParams.delete('peek');
  return url.pathname + (url.searchParams.size ? `?${url.searchParams}` : '');
};

const mark = (row: HTMLElement | null): void => {
  for (const r of rows()) r.toggleAttribute('data-peeked', r === row);
};

let latest = 0;

const close = (push = true): void => {
  if (!pane) return;
  latest += 1;
  pane.hidden = true;
  pane.innerHTML = '';
  mark(null);
  if (push) history.pushState(null, '', withPeek(null));
};

const open = async (row: HTMLElement, push = true): Promise<void> => {
  const path = row.dataset.peek;
  const id = row.dataset.peekId;
  if (!pane || !path || !id) return;
  const wasOpen = !pane.hidden;
  const ticket = ++latest;
  const res = await fetch(`${path}?close=${encodeURIComponent(withPeek(null))}`, { headers: { accept: 'text/html' } });
  if (!res.ok || ticket !== latest) return;
  pane.innerHTML = await res.text();
  stampFrom(pane);
  pane.hidden = false;
  mark(row);
  focusRow(row);
  pane.scrollTop = 0;
  if (push) history[wasOpen ? 'replaceState' : 'pushState'](null, '', withPeek(id));
};

const opensPage = (e: MouseEvent): boolean => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

const keepsOwnClick = 'button, input, select, textarea, label, form, [data-status-menu], a:not(.row-link)';

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || opensPage(e) || !(e.target instanceof Element)) return;
  const row = e.target.closest<HTMLElement>('.list-row[data-peek]');
  if (!row || e.target.closest(keepsOwnClick)) return;
  e.preventDefault();
  void open(row);
});

pane?.addEventListener('click', (e) => {
  if (e.target instanceof Element && e.target.closest('[data-pane-close]')) {
    e.preventDefault();
    close();
  }
});

onFocusRow((row) => {
  if (pane && !pane.hidden && row.hasAttribute('data-peek') && row !== peeked()) void open(row);
});

on('close', () => {
  if (!pane || pane.hidden) return false;
  close();
});

on('peek', () => {
  const row = focusedRow();
  if (!pane || !row?.hasAttribute('data-peek')) return false;
  if (!pane.hidden && row === peeked()) close();
  else void open(row);
});

window.addEventListener('popstate', () => {
  const id = idInUrl();
  const row = id ? rows().find((r) => r.dataset.peekId === id) : undefined;
  if (row) void open(row, false);
  else close(false);
});

const initial = peeked();
if (initial) focusRow(initial);
