const rowsNow = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.list-row[data-row]')];

let active: HTMLElement | null = null;

/** The row j/k last landed on, if it is still on the page. */
export const focusedRow = (): HTMLElement | null => (active?.isConnected ? active : null);

export const hrefOf = (row: HTMLElement | null): string | undefined => row?.querySelector<HTMLAnchorElement>('a.row-link')?.href;

export function focusRow(row: HTMLElement | undefined): void {
  if (!row) return;
  active?.removeAttribute('data-focus');
  active = row;
  row.setAttribute('data-focus', '1');
  row.scrollIntoView({ block: 'nearest' });
}

const step = (by: number): void => {
  const rows = rowsNow();
  if (!rows.length) return;
  const at = focusedRow() ? rows.indexOf(active as HTMLElement) : -1;
  focusRow(rows[Math.max(0, Math.min(at + by, rows.length - 1))]);
};

export const isTyping = (t: EventTarget | null): boolean => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return;
  if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) {
    if (e.key !== 'j' && e.key !== 'k') return;
  }
  if (e.key === 'j') step(1);
  else if (e.key === 'k') step(-1);
  else if (e.key === 'Enter') {
    const href = hrefOf(focusedRow());
    if (href) location.href = href;
  }
});
