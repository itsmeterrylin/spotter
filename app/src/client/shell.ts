import { type Action, type Binding, type Group } from './keymap.ts';
import { activeBindings, on, setModal } from './keys.ts';

const goTo: Array<[Action, string]> = [
  ['go.issues', '/'],
  ['go.traces', '/traces'],
  ['go.judges', '/judges'],
  ['go.runs', '/runs'],
  ['go.datasets', '/datasets'],
  ['go.notifications', '/notifications'],
  ['go.settings', '/settings'],
];

for (const [action, path] of goTo) {
  on(action, () => {
    location.href = path;
  });
}

// "/" and the rail search button open the sidebar on narrow screens and focus its search box.
const searchBox = document.getElementById('sidebar-search');
const focusSearch = (): boolean => {
  if (!searchBox) return false;
  const toggle = document.getElementById('nav-toggle');
  if (toggle instanceof HTMLInputElement) toggle.checked = true;
  searchBox.focus();
  return true;
};
on('search', focusSearch);
document.querySelector('[data-search]')?.addEventListener('click', (e) => {
  if (focusSearch()) e.preventDefault();
});

const capNames: Record<string, string> = { ArrowDown: '↓', ArrowUp: '↑', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', 'Mod+Enter': '⌘ Enter', 'Mod+/': '⌘ /' };

const caps = (spec: string): string[] => {
  const parts = spec.split(' ').map((k) => capNames[k] ?? (k.length === 1 ? k.toUpperCase() : k));
  return parts.length > 1 ? [parts.join(' then ')] : parts;
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

const keyCell = (b: Binding): HTMLElement => {
  const cell = el('span', 'keys-cell');
  b.keys.forEach((spec, i) => {
    if (i > 0) cell.append(el('span', 'faint', 'or'));
    for (const cap of caps(spec)) cell.append(el('kbd', 'kbd', cap));
  });
  return cell;
};

const order: Group[] = ['General', 'Go to', 'Rows', 'Page', 'Review'];

function render(): HTMLElement {
  const bindings = activeBindings();
  const scrim = el('div', 'overlay-scrim');
  scrim.dataset.help = '';
  const dialog = el('div', 'help menu-panel');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Keyboard shortcuts');
  dialog.append(el('h2', 'help-title', 'Keyboard shortcuts'));
  for (const group of order) {
    const inGroup = bindings.filter((b) => b.group === group);
    if (!inGroup.length) continue;
    const section = el('section', 'help-group');
    section.append(el('h3', 'help-heading', group));
    for (const b of inGroup) {
      const row = el('div', 'help-row');
      row.append(el('span', '', b.label), keyCell(b));
      section.append(row);
    }
    dialog.append(section);
  }
  scrim.append(dialog);
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) closeHelp();
  });
  return scrim;
}

let open: HTMLElement | null = null;

function closeHelp(): boolean {
  if (!open) return false;
  open.remove();
  open = null;
  setModal(false);
  return true;
}

on('help', () => {
  if (closeHelp()) return;
  open = render();
  document.body.append(open);
  setModal(true);
});
on('close', closeHelp);
