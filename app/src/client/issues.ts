import { patchIssue } from './api.ts';
import './statusMenu.ts';

const rows = [...document.querySelectorAll<HTMLElement>('.list-row[data-row]')];
const hrefOf = (row: HTMLElement | undefined): string | undefined => row?.querySelector<HTMLAnchorElement>('a.row-link')?.href;
const list = document.querySelector<HTMLElement>('.issue-list');
const form = document.getElementById('row-dismiss') as HTMLFormElement | null;
let index = -1;

const focus = (i: number): void => {
  index = Math.max(0, Math.min(i, rows.length - 1));
  for (const [n, r] of rows.entries()) {
    if (n === index) r.setAttribute('data-focus', '1');
    else r.removeAttribute('data-focus');
  }
  rows[index]?.scrollIntoView({ block: 'nearest' });
};

const hideForm = (): void => {
  if (form) form.hidden = true;
};

const showForm = (): void => {
  const row = rows[index];
  if (!form || !row || list?.dataset.status === 'dismissed') return;
  row.after(form);
  form.hidden = false;
  form.querySelector('input')?.focus();
};

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = rows[index]?.dataset.id;
  if (!id) return;
  const reason = String(new FormData(form).get('reason') ?? '');
  const error = await patchIssue(id, { status: 'dismissed', dismissed_reason: reason });
  if (error === null) location.reload();
  else {
    const slot = form.querySelector('[data-error]');
    if (slot) slot.textContent = error;
  }
});

document.addEventListener('statusmenu:pick', (e) => {
  const row = (e.target as Element).closest<HTMLElement>('.list-row[data-row]');
  if (!row) return;
  focus(rows.indexOf(row));
  showForm();
});

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
    if (e.key === 'Escape') hideForm();
    return;
  }
  if (!rows.length) return;
  if (e.key === 'j') focus(index + 1);
  else if (e.key === 'k') focus(index - 1);
  else if (e.key === 'Enter' && index >= 0) {
    const href = hrefOf(rows[index]);
    if (href) location.href = href;
  } else if (e.key === 'd' && index >= 0) {
    e.preventDefault();
    showForm();
  } else if (e.key === 'Escape') hideForm();
});
