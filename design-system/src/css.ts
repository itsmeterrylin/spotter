/**
 * Generates spotter.css from tokens.ts.
 *
 * Contents: tokens (light on :root, dark under prefers-color-scheme and
 * data-theme), base, seven components, eight shell components, a few
 * utilities. That is the whole system. The class names are the contract.
 */

import { color, font, space, radius, shadow, duration, iconSize, size, type Colors, type SizeToken } from './tokens.ts';

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const vars = (c: Colors) => Object.entries(c).map(([k, v]) => `  --${kebab(k)}: ${v};`).join('\n');

const w = font.weight;
const typeWeight: Record<SizeToken, number> = { meta: w.book, ui: w.medium, content: w.book, heading: w.bold, title: w.bold, stat: w.bold };

export function css(): string {
  const sizes = (Object.keys(font.size) as SizeToken[])
    .map((k) => `  --text-${k}: ${font.size[k]}px;\n  --lh-${k}: ${font.lineHeight[k]};`)
    .join('\n');
  const spaces = space.map((v) => `  --space-${v}: ${v}px;`).join('\n');
  const text = (Object.keys(font.size) as SizeToken[])
    .map((k) => `.t-${k} { font-size: var(--text-${k}); line-height: var(--lh-${k}); font-weight: ${typeWeight[k]};${k === 'title' ? ' letter-spacing: -0.1px;' : ''} }`)
    .join('\n');

  return `:root {
${vars(color.light)}
  --on-brand: #FFFFFF;
  --font: ${font.family};
  --font-mono: ${font.mono};
${sizes}
${spaces}
  --radius-control: ${radius.control}px;
  --radius-panel: ${radius.panel}px;
  --radius-menu: ${radius.menu}px;
  --radius-switcher: ${radius.switcher}px;
  --radius-pill: ${radius.pill}px;
  --shadow-panel: ${shadow.panel};
  --shadow-popover: ${shadow.popover};
  --duration: ${duration};
  --icon-sm: ${iconSize.sm}px;
  --icon-md: ${iconSize.md}px;
  --icon-lg: ${iconSize.lg}px;
  --control: ${size.control}px;
  --chip: ${size.chip}px;
  --menu-item: ${size.menuItem}px;
  --group-header: ${size.groupHeader}px;
  --row: ${size.row}px;
  --container: ${size.container}px;
  --container-narrow: ${size.containerNarrow}px;
  --detail: ${size.detail}px;
  --rail: ${size.rail}px;
  --sidebar: ${size.sidebar}px;
  --aside: ${size.aside}px;
  --statusbar: ${size.statusbar}px;
  --header: ${size.header}px;
  --tint: 14%;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${vars(color.dark)}
    --on-brand: ${color.dark.canvas};
    --tint: 22%;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${vars(color.dark)}
  --on-brand: ${color.dark.canvas};
  --tint: 22%;
  color-scheme: dark;
}

/* Base */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--canvas); color: var(--ink); font-family: var(--font); font-size: var(--text-ui); line-height: var(--lh-ui); font-weight: ${w.regular}; -webkit-font-smoothing: antialiased; }
h1, h2, h3, p, dl, dd { margin: 0; }
h1, h2, h3 { text-wrap: balance; }
a { color: inherit; }
button, input, select, textarea { font: inherit; color: inherit; }
img, svg { display: block; max-width: 100%; }
[hidden] { display: none !important; }
:focus-visible { outline: none; box-shadow: 0 0 0 1px var(--focus); }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.01ms !important; } }

/* Type */
${text}
.strong { font-weight: ${w.medium}; }
.bold { font-weight: ${w.bold}; }
.muted { color: var(--ink-muted); }
.faint { color: var(--ink-faint); }
.mono { font-family: var(--font-mono); }
.num { font-variant-numeric: tabular-nums lining-nums; }
.link { color: var(--ink-muted); font-weight: ${w.book}; text-decoration: none; text-underline-offset: 3px; }
.link:hover { color: var(--ink); text-decoration: underline; }
.link-title { color: var(--ink); font-weight: ${w.medium}; }
.pos { color: var(--pass); }
.neg { color: var(--fail); }

/* Layout utilities */
.stack { display: flex; flex-direction: column; gap: var(--gap, var(--space-16)); }
.cluster { display: flex; flex-wrap: wrap; align-items: center; gap: var(--gap, var(--space-16)); }
.container { width: 100%; max-width: var(--container); margin-inline: auto; padding-inline: var(--space-16); }
@media (min-width: 900px) { .container { padding-inline: var(--space-24); } }
.narrow { max-width: var(--container-narrow); }
.scroll-x { overflow-x: auto; }

/* Icon. Takes the color of the adjacent text role. */
.ic { width: var(--icon-md); height: var(--icon-md); flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.ic-sm { width: var(--icon-sm); height: var(--icon-sm); }
.ic-lg { width: var(--icon-lg); height: var(--icon-lg); }

/* 1. Button */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-6); height: var(--control); padding: 0 var(--space-10); border-radius: var(--radius-pill); border: 1px solid transparent; font-size: var(--text-meta); line-height: var(--lh-meta); font-weight: ${w.medium}; background: var(--raised); box-shadow: var(--shadow-panel); cursor: pointer; text-decoration: none; white-space: nowrap; transition: background var(--duration); }
.btn[disabled] { opacity: 0.45; cursor: not-allowed; }
.btn-primary { background: var(--brand); color: var(--on-brand); }
.btn-secondary { border-color: var(--border-subtle); }
.btn-secondary[aria-pressed="true"] { background: var(--fill); }
.btn-ghost { background: transparent; box-shadow: none; color: var(--ink-muted); }
.btn-ghost:hover { color: var(--ink); background: var(--fill); }
.btn-pass { background: var(--pass); color: var(--on-brand); }
.btn-fail { background: var(--fail); color: var(--on-brand); }
.btn-defer { background: color-mix(in srgb, var(--defer) var(--tint), var(--surface)); color: var(--defer); }
.btn-icon { width: var(--control); padding: 0; }

/* 2. Pill. The 24px chip. */
.pill { display: inline-flex; align-items: center; gap: var(--space-4); height: var(--chip); padding-inline: var(--space-8); border-radius: var(--radius-pill); font-size: var(--text-meta); line-height: var(--lh-meta); font-weight: ${w.medium}; background: var(--fill); color: var(--ink-muted); text-decoration: none; white-space: nowrap; }
.pill:has(> .ic:first-child) { padding-left: var(--space-6); }
.pill-pass { background: color-mix(in srgb, var(--pass) var(--tint), var(--surface)); color: var(--pass); }
.pill-fail { background: color-mix(in srgb, var(--fail) var(--tint), var(--surface)); color: var(--fail); }
.pill-defer { background: color-mix(in srgb, var(--defer) var(--tint), var(--surface)); color: var(--defer); }
.pill-brand { background: color-mix(in srgb, var(--brand) var(--tint), var(--surface)); color: var(--brand); }
.pill-lg { height: var(--control); padding-inline: var(--space-12); font-size: var(--text-ui); line-height: var(--lh-ui); }

/* 3. Card */
.card { background: var(--raised); border: 1px solid var(--border-subtle); border-radius: var(--radius-panel); box-shadow: var(--shadow-panel); padding: var(--space-16); }
.card-flush { padding: 0; background: transparent; border: 0; border-radius: 0; box-shadow: none; }

/* 4. Row */
.row { display: flex; align-items: center; gap: var(--space-12); min-height: var(--row); padding: var(--space-8) var(--space-16); border-bottom: 1px solid var(--border-subtle); }
.row:last-child { border-bottom: 0; }
.row > .grow { flex: 1; min-width: 0; }

/* 5. Table */
.table { width: 100%; border-collapse: collapse; }
.table th { text-align: left; font-size: var(--text-meta); line-height: var(--lh-meta); font-weight: ${w.medium}; color: var(--ink-muted); padding: var(--space-8) var(--space-16); border-bottom: 1px solid var(--border-subtle); white-space: nowrap; }
.table td { height: var(--row); padding: var(--space-8) var(--space-16); border-bottom: 1px solid var(--border-subtle); vertical-align: middle; }
.table tr:last-child td { border-bottom: 0; }
.table tbody tr:hover td { background: var(--fill); }
.table .num { text-align: right; }

/* 6. Input */
.field { display: flex; flex-direction: column; gap: var(--space-6); }
.field label { font-size: var(--text-ui); font-weight: ${w.medium}; color: var(--ink-muted); }
.input { height: var(--control); padding: 0 var(--space-10); border-radius: var(--radius-control); border: 1px solid var(--border); background: var(--raised); width: 100%; font-size: var(--text-ui); }
.input:focus { border-color: var(--brand); box-shadow: 0 0 0 1px var(--brand); outline: none; }
textarea.input { height: auto; min-height: 96px; padding: var(--space-8) var(--space-10); resize: vertical; }

/* 7. Key */
.kbd { display: inline-flex; align-items: center; justify-content: center; min-width: var(--chip); height: var(--chip); padding-inline: var(--space-6); border-radius: var(--radius-control); border: 1px solid var(--border); background: var(--raised); color: var(--ink-muted); font-family: var(--font-mono); font-size: var(--text-meta); font-weight: ${w.medium}; }

/* Shell. Rail and sidebar sit on the canvas. The work area is one inset panel. */

/* 8. Rail */
.rail { display: flex; flex-direction: column; align-items: center; gap: var(--space-8); width: var(--rail); padding-block: var(--space-12); }
.rail-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; width: var(--control); height: var(--control); border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--ink-muted); text-decoration: none; cursor: pointer; transition: background var(--duration), color var(--duration); }
.rail-btn:hover { color: var(--ink); background: var(--fill); }
.rail-btn[aria-current="page"] { color: var(--ink); background: var(--fill); }
.avatar { display: inline-flex; align-items: center; justify-content: center; width: var(--control); height: var(--control); flex: none; border-radius: var(--radius-pill); background: color-mix(in srgb, var(--brand) var(--tint), var(--surface)); color: var(--brand); font-size: var(--text-meta); font-weight: ${w.medium}; text-decoration: none; text-transform: uppercase; }

/* 9. Nav item: one 28px line, trailing count */
.nav2 { display: flex; align-items: center; gap: var(--space-6); height: var(--control); padding: 0 var(--space-10) 0 var(--space-8); border-radius: var(--radius-control); color: var(--ink-muted); font-size: var(--text-ui); line-height: var(--lh-ui); font-weight: ${w.medium}; text-decoration: none; }
.nav2:hover { background: var(--fill); }
.nav2 > .ic { color: inherit; }
.nav2 .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav2 .meta { color: var(--ink-faint); font-size: var(--text-meta); font-weight: ${w.book}; font-variant-numeric: tabular-nums; }
.nav2[aria-current="page"] { background: var(--fill); color: var(--ink); }

/* 10. Tabs: pill chips */
.tabs { display: flex; align-items: center; gap: var(--space-6); overflow-x: auto; scrollbar-width: none; }
.tab { display: inline-flex; align-items: center; gap: var(--space-6); height: var(--control); padding: 0 var(--space-10); border: 1px solid var(--border-subtle); border-radius: var(--radius-pill); background: var(--raised); color: var(--ink-muted); font-size: var(--text-meta); line-height: var(--lh-meta); font-weight: ${w.medium}; text-decoration: none; white-space: nowrap; }
.tab:hover { color: var(--ink); }
.tab[aria-current="page"] { background: var(--fill); border-color: transparent; color: var(--ink); }
.tab .count { color: var(--ink-faint); font-weight: ${w.book}; font-variant-numeric: tabular-nums; }

/* 11. Aside */
.aside { display: flex; flex-direction: column; gap: var(--space-10); width: var(--aside); flex: none; padding: var(--space-16) var(--space-12); border-left: 1px solid var(--border-subtle); }
.panel-body { display: flex; flex-direction: column; gap: var(--space-10); }
.panel-body h2 { padding-inline: var(--space-8); font-size: var(--text-ui); font-weight: ${w.medium}; line-height: 20px; color: var(--ink-muted); }

/* 12. Property: one 28px row, icon then value. The name is a visually hidden dt and the hover title. */
.sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.panel-body dl { display: flex; flex-direction: column; }
.prop { display: flex; align-items: center; min-height: var(--control); min-width: 0; }
.prop > dd { margin: 0; min-width: 0; max-width: 100%; }
.propbtn { display: inline-flex; align-items: center; gap: var(--space-6); max-width: 100%; height: var(--control); padding: 0 var(--space-10) 0 var(--space-6); border-radius: var(--radius-pill); background: transparent; color: var(--ink-secondary); font-size: var(--text-ui); line-height: var(--lh-ui); font-weight: ${w.medium}; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: background var(--duration); }
.propbtn:hover { background: var(--fill); }
.propbtn > .ic { color: var(--ink-muted); }
.propbtn.is-empty, .propbtn.is-empty > .ic { color: var(--ink-muted); }
.propbtn .link { color: inherit; text-decoration: none; }
.propbtn .link:hover { text-decoration: underline; text-underline-offset: 3px; }
/* 13. Status bar: below the panel, on the canvas */
.statusbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-4) var(--space-12); min-height: var(--statusbar); padding-inline: var(--space-12); color: var(--ink-muted); font-size: var(--text-meta); line-height: var(--lh-meta); font-weight: ${w.book}; }
.statusbar > * { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--space-12); }

/* 14. State circle: open hollow, confirmed filled brand, dismissed slashed */
.state { position: relative; display: inline-block; width: var(--icon-sm); height: var(--icon-sm); flex: none; border: 1.5px solid var(--ink-faint); border-radius: var(--radius-pill); }
.state-confirmed { background: var(--brand); border-color: var(--brand); }
.state-dismissed { border-color: var(--ink-faint); }
.state-dismissed::after { content: ""; position: absolute; top: 50%; left: -2px; right: -2px; height: 1.5px; background: var(--ink-faint); transform: translateY(-50%) rotate(-45deg); }

/* 15. List row: 44px, no dividers, fill on hover */
.list-row { display: flex; align-items: center; gap: var(--space-8); min-height: var(--row); padding-inline: var(--space-12); border-radius: var(--radius-control); color: inherit; text-decoration: none; }
.list-row:hover, .list-row[data-focus] { background: var(--fill); }
.list-row[data-focus] { box-shadow: inset 2px 0 0 var(--brand); }
.list-row > .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list-row > .meta { display: inline-flex; align-items: center; gap: var(--space-4); color: var(--ink-muted); font-size: var(--text-meta); font-weight: ${w.book}; white-space: nowrap; }
.group-head { display: flex; align-items: center; gap: var(--space-8); height: var(--group-header); padding-inline: var(--space-12); border-radius: var(--radius-control); background: var(--canvas); font-size: var(--text-ui); font-weight: ${w.medium}; }
.group-head .count { color: var(--ink-muted); font-weight: ${w.book}; font-variant-numeric: tabular-nums; }

/* 16. Menu: popover, 32px items */
.menu-panel { padding: var(--space-4); background: var(--raised); border: 1px solid var(--border); border-radius: var(--radius-menu); box-shadow: var(--shadow-popover); }
.menu-panel .nav2 { height: var(--menu-item); padding: 0 18px 0 14px; color: var(--ink); font-weight: ${w.regular}; }

/* 17. Status menu: round 28px trigger, 208px popover, search row then 32px items */
.status-menu { position: relative; display: inline-flex; flex: none; z-index: 1; }
.status-menu[data-open] { z-index: 40; }
.status-trigger { display: inline-flex; align-items: center; justify-content: center; width: var(--control); height: var(--control); padding: 0; border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--ink-muted); cursor: pointer; transition: background var(--duration); }
.status-trigger:hover, .status-trigger[aria-expanded="true"] { background: var(--fill); }
.status-menu .propbtn { border: 0; cursor: pointer; }
.status-popover { position: absolute; top: calc(100% + var(--space-4)); left: 0; z-index: 30; width: 208px; text-align: left; font-weight: ${w.regular}; }
.status-menu[data-up] .status-popover { top: auto; bottom: calc(100% + var(--space-4)); }
.status-search { display: flex; align-items: center; gap: var(--space-8); height: 36px; padding: 0 var(--space-6) 0 var(--space-10); border-bottom: 1px solid var(--border-subtle); }
.status-search input { flex: 1; min-width: 0; height: 100%; padding: 0; border: 0; background: transparent; font-size: var(--text-ui); outline: none; }
.status-search input::placeholder { color: var(--ink-faint); }
.status-search input:focus-visible { box-shadow: none; }
.status-items { display: flex; flex-direction: column; padding-top: var(--space-4); }
.status-item { display: flex; align-items: center; gap: var(--space-8); width: 100%; height: var(--menu-item); padding: 0 var(--space-12) 0 var(--space-10); border: 0; border-radius: var(--radius-control); background: transparent; color: var(--ink); font-size: var(--text-ui); line-height: 19.5px; font-weight: ${w.regular}; text-align: left; cursor: pointer; }
.status-item:hover:not([aria-disabled="true"]), .status-item[data-active], .status-item[aria-checked="true"] { background: var(--fill); }
.status-item[aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; }
.status-item .status-ico { display: inline-flex; align-items: center; width: var(--icon-md); flex: none; }
.status-item .status-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-item .status-key { width: var(--icon-sm); text-align: right; color: var(--ink-faint); font-size: var(--text-meta); font-variant-numeric: tabular-nums; }
.status-error { padding: var(--space-4) var(--space-10); font-size: var(--text-meta); }
.stico { display: inline-flex; align-items: center; }
.st-draft { color: var(--ink-faint); }
.st-live { color: var(--pass); }
.st-paused { color: var(--ink-muted); }

/* Bar (goes inside a card or row) */
.bar { position: relative; height: 8px; border-radius: var(--radius-pill); background: var(--fill); overflow: hidden; }
.bar > i { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: var(--brand); }
.bar-pass > i { background: var(--pass); }
.bar-fail > i { background: var(--fail); }
`;
}
