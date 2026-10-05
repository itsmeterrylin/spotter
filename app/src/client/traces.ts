import './list.ts';
import { wireNewIssue } from './newIssue.ts';

const rows = [...document.querySelectorAll<HTMLElement>('.list-row[data-trace]')];
const pane = document.getElementById('pane') as HTMLElement | null;
wireNewIssue();

const withTrace = (id: string | null): string => {
  const url = new URL(location.href);
  if (id) url.searchParams.set('trace', id);
  else url.searchParams.delete('trace');
  return url.pathname + (url.searchParams.size ? `?${url.searchParams}` : '');
};

const mark = (id: string | null): void => {
  for (const r of rows) {
    if (r.dataset.trace === id) r.setAttribute('data-selected', '1');
    else r.removeAttribute('data-selected');
  }
};

const closePane = (push = true): void => {
  if (!pane) return;
  pane.hidden = true;
  pane.innerHTML = '';
  mark(null);
  if (push) history.pushState(null, '', withTrace(null));
};

const openPane = async (id: string, push = true): Promise<void> => {
  if (!pane) return;
  const res = await fetch(`/traces/${id}/pane?close=${encodeURIComponent(withTrace(null))}`, { headers: { accept: 'text/html' } });
  if (!res.ok) return;
  pane.innerHTML = await res.text();
  pane.hidden = false;
  mark(id);
  if (push) history.pushState(null, '', withTrace(id));
  pane.scrollTop = 0;
  rows.find((r) => r.dataset.trace === id)?.scrollIntoView({ block: 'nearest' });
};

const selectedIndex = (): number => rows.findIndex((r) => r.hasAttribute('data-selected'));

const opensPage = (e: MouseEvent): boolean => e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0;

for (const row of rows) {
  row.addEventListener('click', (e) => {
    if (opensPage(e) || !(e.target instanceof Element)) return;
    const link = e.target.closest('a');
    if (link && !link.classList.contains('row-link')) return;
    e.preventDefault();
    const id = row.dataset.trace;
    if (id) void openPane(id);
  });
}

pane?.addEventListener('click', (e) => {
  if (e.target instanceof Element && e.target.closest('[data-pane-close]')) {
    e.preventDefault();
    closePane();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
  const i = selectedIndex();
  if (e.key === 'Escape' && i >= 0) closePane();
  else if (e.key === 'ArrowDown' && rows.length) { e.preventDefault(); void openPane(rows[Math.min(i + 1, rows.length - 1)]?.dataset.trace ?? ''); }
  else if (e.key === 'ArrowUp' && rows.length) { e.preventDefault(); void openPane(rows[Math.max(i - 1, 0)]?.dataset.trace ?? ''); }
});

window.addEventListener('popstate', () => {
  const id = new URL(location.href).searchParams.get('trace');
  if (id) void openPane(id, false);
  else closePane(false);
});

