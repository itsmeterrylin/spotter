import { isTyping } from './list.ts';
import { type Kind, patchStatus, refreshMenus } from './statusMenu.ts';

const list = document.querySelector<HTMLElement>('[data-list]');
const bar = document.querySelector<HTMLElement>('[data-bulk-bar]');
const count = bar?.querySelector<HTMLElement>('[data-bulk-count]') ?? null;
const reasonForm = bar?.querySelector<HTMLFormElement>('[data-bulk-reason]') ?? null;
const errorSlot = bar?.querySelector<HTMLElement>('[data-bulk-error]') ?? null;
const bulkMenu = bar?.querySelector<HTMLElement>('[data-status-menu]') ?? null;
const kind = (bulkMenu?.dataset.kind ?? 'issue') as Kind;

const checks = (): HTMLInputElement[] => [...document.querySelectorAll<HTMLInputElement>('.list-row[data-row] .row-check')];
const selected = (): HTMLElement[] => checks().filter((c) => c.checked).map((c) => c.closest<HTMLElement>('.list-row[data-row]') as HTMLElement);
const labelOf = (row: HTMLElement): string => row.querySelector('.row-link')?.textContent ?? row.dataset.id ?? '';

function sync(): void {
  const rows = selected();
  for (const c of checks()) c.closest('.list-row')?.toggleAttribute('data-selected', c.checked);
  list?.toggleAttribute('data-selecting', rows.length > 0);
  if (bar) bar.hidden = rows.length === 0;
  if (count) count.textContent = `${rows.length} selected`;
  if (!rows.length && reasonForm) reasonForm.hidden = true;
}

function clear(): void {
  for (const c of checks()) c.checked = false;
  if (errorSlot) errorSlot.textContent = '';
  sync();
}

/** Apply one move to every selected row in turn. Failed rows stay selected and are named in the bar. */
async function apply(value: string, reason?: string): Promise<void> {
  const failures: string[] = [];
  const moved: HTMLElement[] = [];
  for (const row of selected()) {
    const menu = row.querySelector<HTMLElement>('[data-status-menu]');
    if (!menu || menu.dataset.current === value) continue;
    const error = await patchStatus(kind, menu.dataset.id ?? '', value, reason);
    if (error === null) {
      moved.push(menu);
      const check = row.querySelector<HTMLInputElement>('.row-check');
      if (check) check.checked = false;
    } else failures.push(`${labelOf(row)}: ${error}`);
  }
  if (moved.length) await refreshMenus(moved);
  if (errorSlot) errorSlot.textContent = failures.join('\n');
  if (reasonForm && !failures.length) reasonForm.hidden = true;
  sync();
}

document.addEventListener('change', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.matches('.row-check')) sync();
});

bar?.addEventListener('statusmenu:pick', (e) => {
  const { value, needsReason } = (e as CustomEvent<{ value: string; needsReason: boolean }>).detail;
  if (needsReason && reasonForm) {
    reasonForm.dataset.value = value;
    reasonForm.hidden = false;
    reasonForm.querySelector('input')?.focus();
  } else void apply(value);
});

reasonForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  void apply(reasonForm.dataset.value ?? 'dismissed', String(new FormData(reasonForm).get('reason') ?? ''));
});

bar?.querySelector('[data-bulk-clear]')?.addEventListener('click', clear);

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
  if (e.key === 'x' && !isTyping(e.target)) {
    const check = document.querySelector<HTMLInputElement>('.list-row[data-focus] .row-check');
    if (!check) return;
    check.checked = !check.checked;
    sync();
  } else if (e.key === 'Escape' && selected().length && !isTyping(e.target)) clear();
});
