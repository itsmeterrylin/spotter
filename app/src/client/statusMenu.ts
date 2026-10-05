import { patchIssue, patchJudge } from './api.ts';

export type Kind = 'issue' | 'judge';

const menuOf = (el: Element | null): HTMLElement | null => el?.closest<HTMLElement>('[data-status-menu]') ?? null;
const popover = (m: HTMLElement): HTMLElement | null => m.querySelector('[data-status-popover]');
const searchBox = (m: HTMLElement): HTMLInputElement | null => m.querySelector('[data-status-search]');
const trigger = (m: HTMLElement): HTMLElement | null => m.querySelector('[data-status-trigger]');
const errorSlot = (m: HTMLElement): HTMLElement | null => m.querySelector('[data-error]');
const items = (m: HTMLElement): HTMLButtonElement[] => [...m.querySelectorAll<HTMLButtonElement>('.status-item')];
const pickable = (m: HTMLElement): HTMLButtonElement[] => items(m).filter((i) => !i.hidden && i.getAttribute('aria-disabled') !== 'true');

/** PATCH one issue or judge. Resolves to an error message, or null on success. */
export const patchStatus = (kind: Kind, id: string, value: string, reason?: string): Promise<string | null> =>
  kind === 'issue' ? patchIssue(id, reason === undefined ? { status: value } : { status: value, dismissed_reason: reason }) : patchJudge(id, { state: value });

let current: HTMLElement | null = null;

const setActive = (m: HTMLElement, item: HTMLElement | undefined): void => {
  for (const i of items(m)) i.toggleAttribute('data-active', i === item);
  item?.scrollIntoView({ block: 'nearest' });
};

const show = (m: HTMLElement): void => {
  close();
  const box = searchBox(m);
  if (box) box.value = '';
  for (const i of items(m)) i.hidden = false;
  const error = errorSlot(m);
  if (error) error.textContent = '';
  m.setAttribute('data-open', '');
  const pop = popover(m);
  if (pop) pop.hidden = false;
  trigger(m)?.setAttribute('aria-expanded', 'true');
  setActive(m, pickable(m).find((i) => i.dataset.value === m.dataset.current) ?? pickable(m)[0]);
  box?.focus();
  current = m;
};

function close(refocus = false): void {
  const m = current;
  if (!m) return;
  m.removeAttribute('data-open');
  const pop = popover(m);
  if (pop) pop.hidden = true;
  trigger(m)?.setAttribute('aria-expanded', 'false');
  if (refocus) trigger(m)?.focus();
  current = null;
}

const filter = (m: HTMLElement): void => {
  const q = (searchBox(m)?.value ?? '').trim().toLowerCase();
  for (const i of items(m)) i.hidden = !(i.dataset.label ?? '').toLowerCase().includes(q);
  setActive(m, pickable(m)[0]);
};

const move = (m: HTMLElement, step: number): void => {
  const list = pickable(m);
  if (!list.length) return;
  const at = list.findIndex((i) => i.hasAttribute('data-active'));
  setActive(m, list[(at + step + list.length) % list.length]);
};

/** Replace one menu, and the tab counts, with what the server now renders. Falls back to dropping the row or reloading. */
export async function refreshMenu(m: HTMLElement): Promise<void> {
  const res = await fetch(location.href, { headers: { accept: 'text/html' } });
  if (!res.ok) return location.reload();
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  const fresh = doc.querySelector(`[data-status-menu][data-kind="${m.dataset.kind}"][data-id="${CSS.escape(m.dataset.id ?? '')}"]`);
  const tabs = doc.querySelector('.tabs');
  if (tabs) document.querySelector('.tabs')?.replaceWith(document.importNode(tabs, true));
  if (fresh) m.replaceWith(document.importNode(fresh, true));
  else m.closest('[data-row]')?.remove();
}

async function pick(m: HTMLElement, item: HTMLElement): Promise<void> {
  const value = item.dataset.value ?? '';
  const slot = errorSlot(m);
  if (item.getAttribute('aria-disabled') === 'true') {
    if (slot) slot.textContent = item.title;
    return;
  }
  if (value === m.dataset.current) return close(true);
  if (m.dataset.variant === 'bulk' || item.dataset.needsReason) {
    close();
    m.dispatchEvent(new CustomEvent('statusmenu:pick', { bubbles: true, detail: { value, needsReason: Boolean(item.dataset.needsReason) } }));
    return;
  }
  const error = await patchStatus(m.dataset.kind as Kind, m.dataset.id ?? '', value);
  if (error !== null) {
    if (slot) slot.textContent = error;
    return;
  }
  close();
  if (m.dataset.reload) location.reload();
  else await refreshMenu(m);
}

const typing = (t: EventTarget | null): boolean => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;

const hotkeyTarget = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-row][data-focus] [data-status-menu]') ?? document.querySelector<HTMLElement>('[data-status-menu][data-variant="field"]');

function onKey(e: KeyboardEvent): void {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const m = current;
  if (m) {
    const active = items(m).find((i) => i.hasAttribute('data-active'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') move(m, e.key === 'ArrowDown' ? 1 : -1);
    else if (e.key === 'Enter' && active) void pick(m, active);
    else if (e.key === 'Escape') close(true);
    else if (/^[1-9]$/.test(e.key)) {
      const item = items(m)[Number(e.key) - 1];
      if (!item) return;
      void pick(m, item);
    } else return;
    e.preventDefault();
    return;
  }
  if (e.key !== 's' || typing(e.target)) return;
  const target = hotkeyTarget();
  if (!target) return;
  e.preventDefault();
  show(target);
}

document.addEventListener('keydown', onKey, true);

document.addEventListener('click', (e) => {
  const target = e.target instanceof Element ? e.target : null;
  const toggle = target?.closest<HTMLElement>('[data-status-trigger]');
  const item = target?.closest<HTMLButtonElement>('.status-item');
  const owner = menuOf(target);
  if (toggle && owner) {
    e.preventDefault();
    if (current === owner) close();
    else show(owner);
  } else if (item && owner) void pick(owner, item);
  else if (current && owner !== current) close();
});

document.addEventListener('input', (e) => {
  const owner = e.target instanceof Element && e.target.matches('[data-status-search]') ? menuOf(e.target) : null;
  if (owner) filter(owner);
});

document.addEventListener('mouseover', (e) => {
  const item = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.status-item') : null;
  const owner = menuOf(item);
  if (item && owner && owner === current && item.getAttribute('aria-disabled') !== 'true') setActive(owner, item);
});
