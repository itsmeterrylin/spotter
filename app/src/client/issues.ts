import { patchIssue } from './api.ts';
import './bulk.ts';
import './panels.ts';
import './peek.ts';
import { on } from './keys.ts';
import { focusedRow, focusRow } from './list.ts';
import './statusMenu.ts';

const list = document.querySelector<HTMLElement>('.issue-list');
const form = document.getElementById('row-dismiss') as HTMLFormElement | null;
let target: HTMLElement | null = null;

const hideForm = (): void => {
  if (form) form.hidden = true;
};

const showForm = (row: HTMLElement | null): void => {
  if (!form || !row || list?.dataset.status === 'dismissed') return;
  target = row;
  row.after(form);
  form.hidden = false;
  form.querySelector('input')?.focus();
};

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = target?.dataset.id;
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
  focusRow(row);
  showForm(row);
});

on('dismiss', () => {
  const row = focusedRow();
  if (!row) return false;
  showForm(row);
});

on('close', () => {
  if (!form || form.hidden) return false;
  hideForm();
});
