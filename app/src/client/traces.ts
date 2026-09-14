const rows = [...document.querySelectorAll<HTMLElement>('tr.linkrow[data-trace]')];
const pane = document.getElementById('pane') as HTMLElement | null;
const split = pane?.parentElement as HTMLElement | null;

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
  if (!pane || !split) return;
  pane.hidden = true;
  pane.innerHTML = '';
  split.removeAttribute('data-pane');
  mark(null);
  if (push) history.pushState(null, '', withTrace(null));
};

const openPane = async (id: string, push = true): Promise<void> => {
  if (!pane || !split) return;
  const res = await fetch(`/traces/${id}/pane?close=${encodeURIComponent(withTrace(null))}`, { headers: { accept: 'text/html' } });
  if (!res.ok) return;
  pane.innerHTML = await res.text();
  pane.hidden = false;
  split.setAttribute('data-pane', '1');
  mark(id);
  if (push) history.pushState(null, '', withTrace(id));
  pane.scrollTop = 0;
  rows.find((r) => r.dataset.trace === id)?.scrollIntoView({ block: 'nearest' });
};

const selectedIndex = (): number => rows.findIndex((r) => r.hasAttribute('data-selected'));

for (const tr of rows) {
  tr.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('a')) return;
    const id = tr.dataset.trace;
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
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  const i = selectedIndex();
  if (e.key === 'Escape' && i >= 0) closePane();
  else if (e.key === 'ArrowDown' && rows.length) { e.preventDefault(); void openPane(rows[Math.min(i + 1, rows.length - 1)]?.dataset.trace ?? ''); }
  else if (e.key === 'ArrowUp' && rows.length) { e.preventDefault(); void openPane(rows[Math.max(i - 1, 0)]?.dataset.trace ?? ''); }
  else if (e.key === 'Enter' && i >= 0) { const href = rows[i]?.dataset.href; if (href) location.href = href; }
});

window.addEventListener('popstate', () => {
  const id = new URL(location.href).searchParams.get('trace');
  if (id) void openPane(id, false);
  else closePane(false);
});

export {};
