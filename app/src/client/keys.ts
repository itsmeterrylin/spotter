/**
 * Key dispatcher. The table lives in `keymap.ts`; modules attach behavior with `on(action, fn)`.
 * A key does nothing in a view until some module has registered its action, so the `?` overlay
 * lists exactly the keys that work on the current page. Keys are inert while typing, except those
 * flagged `typing`.
 */

import { type Action, type Binding, keymap, type View } from './keymap.ts';

type Handler = () => boolean | void;

const handlers = new Map<Action, Handler[]>();

/** Attach behavior to an action. Return `false` to decline, so the next handler for the key gets a turn. */
export const on = (action: Action, fn: Handler): void => {
  handlers.set(action, [...(handlers.get(action) ?? []), fn]);
};

export const viewOf = (): View => {
  const v = document.body.dataset.view;
  return v === 'detail' || v === 'review' ? v : 'list';
};

/** The bindings that work on this page: in this view, with a handler attached. */
export const activeBindings = (): Binding[] => keymap.filter((b) => (!b.views || b.views.includes(viewOf())) && handlers.has(b.action));

export const isTyping = (t: EventTarget | null): boolean =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || (t instanceof HTMLElement && t.isContentEditable);

const isControl = (t: EventTarget | null): boolean => t instanceof HTMLButtonElement || t instanceof HTMLAnchorElement || (t instanceof HTMLElement && t.tagName === 'SUMMARY');

let modal = false;

/** While true, only bindings flagged `modal` fire. The help overlay sets it. */
export const setModal = (on_: boolean): void => {
  modal = on_;
};

const specOf = (e: KeyboardEvent): string | null => {
  const k = e.key === ' ' ? 'Space' : e.key;
  const mod = e.metaKey || e.ctrlKey;
  if (k === 'Meta' || k === 'Control' || k === 'Shift' || k === 'Alt') return null;
  if (e.shiftKey && /^[a-z]$/i.test(k)) return null;
  return `${mod ? 'Mod+' : ''}${k.length === 1 ? k.toLowerCase() : k}`;
};

function fire(spec: string, e: KeyboardEvent, typing: boolean): boolean {
  const view = viewOf();
  for (const b of keymap) {
    if (!b.keys.includes(spec) || (b.views && !b.views.includes(view))) continue;
    if ((typing && !b.typing) || (modal && !b.modal) || (b.skipOnControl && isControl(e.target))) continue;
    for (const fn of handlers.get(b.action) ?? []) {
      if (fn() === false) continue;
      e.preventDefault();
      return true;
    }
  }
  return false;
}

const SEQUENCE_MS = 1500;
let prefix: string | null = null;
let prefixTimer: ReturnType<typeof setTimeout> | undefined;

const startsSequence = (spec: string): boolean => keymap.some((b) => b.keys.some((k) => k.startsWith(`${spec} `)));

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.altKey || e.isComposing) return;
  const spec = specOf(e);
  if (!spec) return;
  const typing = isTyping(e.target);
  const pending = prefix;
  prefix = null;
  clearTimeout(prefixTimer);
  if (pending && !typing && !modal && fire(`${pending} ${spec}`, e, typing)) return;
  if (!typing && !modal && startsSequence(spec)) {
    prefix = spec;
    prefixTimer = setTimeout(() => (prefix = null), SEQUENCE_MS);
    return;
  }
  if (!fire(spec, e, typing) && spec === 'Escape' && typing && e.target instanceof HTMLElement) e.target.blur();
});
