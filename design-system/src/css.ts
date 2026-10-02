/**
 * Generates spotter.css from tokens.ts.
 *
 * Contents: tokens (light on :root, dark under prefers-color-scheme and
 * data-theme), base, seven components, eight shell components, a few
 * utilities. That is the whole system. The class names are the contract.
 */

import { color, font, space, radius, duration, iconSize, size, type Colors, type SizeToken } from './tokens.ts';

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const vars = (c: Colors) => Object.entries(c).map(([k, v]) => `  --${kebab(k)}: ${v};`).join('\n');

export function css(): string {
  const sizes = (Object.keys(font.size) as SizeToken[])
    .map((k) => `  --text-${k}: ${font.size[k]}px;\n  --lh-${k}: ${font.lineHeight[k]};`)
    .join('\n');
  const spaces = space.map((v) => `  --space-${v}: ${v}px;`).join('\n');
  const text = (Object.keys(font.size) as SizeToken[])
    .map((k) => {
      const weight = k === 'stat' ? font.weight.heavy : k === 'caption' || k === 'title' ? font.weight.semibold : font.weight.regular;
      const ls = k === 'stat' ? '-0.03em' : k === 'title' ? '-0.01em' : '0';
      return `.t-${k} { font-size: var(--text-${k}); line-height: var(--lh-${k}); font-weight: ${weight}; letter-spacing: ${ls}; }`;
    })
    .join('\n');

  return `:root {
${vars(color.light)}
  --font: ${font.family};
  --font-mono: ${font.mono};
${sizes}
${spaces}
  --radius: ${radius.default}px;
  --radius-pill: ${radius.pill}px;
  --duration: ${duration};
  --icon-sm: ${iconSize.sm}px;
  --icon-md: ${iconSize.md}px;
  --icon-lg: ${iconSize.lg}px;
  --control: ${size.control}px;
  --control-compact: ${size.controlCompact}px;
  --row: ${size.row}px;
  --container: ${size.container}px;
  --container-narrow: ${size.containerNarrow}px;
  --rail: ${size.rail}px;
  --sidebar: ${size.sidebar}px;
  --aside: ${size.aside}px;
  --statusbar: ${size.statusbar}px;
  --row-list: ${size.rowList}px;
  --tint: 14%;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${vars(color.dark)}
    --tint: 22%;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${vars(color.dark)}
  --tint: 22%;
  color-scheme: dark;
}

/* Base */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--canvas); color: var(--ink); font-family: var(--font); font-size: var(--text-body); line-height: var(--lh-body); -webkit-font-smoothing: antialiased; }
h1, h2, h3, p, dl, dd { margin: 0; }
h1, h2, h3 { text-wrap: balance; }
a { color: inherit; }
button, input, select, textarea { font: inherit; color: inherit; }
img, svg { display: block; max-width: 100%; }
[hidden] { display: none !important; }
:focus-visible { outline: none; box-shadow: 0 0 0 4px var(--focus); border-radius: var(--radius); }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.01ms !important; } }

/* Type */
${text}
.strong { font-weight: ${font.weight.semibold}; }
.heavy { font-weight: ${font.weight.heavy}; }
.muted { color: var(--ink-muted); }
.mono { font-family: var(--font-mono); }
.num { font-variant-numeric: tabular-nums lining-nums; }
.link { color: var(--brand); text-decoration: underline; text-underline-offset: 3px; }
.pos { color: var(--pass); }
.neg { color: var(--fail); }

/* Layout utilities */
.stack { display: flex; flex-direction: column; gap: var(--gap, var(--space-16)); }
.cluster { display: flex; flex-wrap: wrap; align-items: center; gap: var(--gap, var(--space-16)); }
.container { width: 100%; max-width: var(--container); margin-inline: auto; padding-inline: var(--space-16); }
@media (min-width: 900px) { .container { padding-inline: var(--space-32); } }
.narrow { max-width: var(--container-narrow); }
.scroll-x { overflow-x: auto; }

/* Icon */
.ic { width: var(--icon-md); height: var(--icon-md); flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.ic-sm { width: var(--icon-sm); height: var(--icon-sm); }
.ic-lg { width: var(--icon-lg); height: var(--icon-lg); }

/* 1. Button */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-8); min-height: var(--control); padding-inline: var(--space-16); border-radius: var(--radius-pill); border: 2px solid transparent; font-weight: ${font.weight.semibold}; cursor: pointer; text-decoration: none; white-space: nowrap; transition: background var(--duration), transform var(--duration); }
.btn:active { transform: translateY(1px); }
.btn[disabled] { opacity: 0.45; cursor: not-allowed; }
.btn-primary { background: var(--brand); color: var(--surface); }
.btn-secondary { background: var(--surface); border-color: var(--border); }
.btn-secondary[aria-pressed="true"] { border-color: var(--ink); }
.btn-ghost { background: transparent; color: var(--ink-muted); }
.btn-ghost:hover { color: var(--ink); background: color-mix(in srgb, var(--ink) 6%, transparent); }
.btn-pass { background: var(--pass); color: var(--surface); }
.btn-fail { background: var(--fail); color: var(--surface); }
.btn-defer { background: color-mix(in srgb, var(--defer) var(--tint), var(--surface)); color: var(--defer); }
.btn-compact { min-height: var(--control-compact); padding-inline: var(--space-16); font-size: var(--text-caption); }
.btn-icon { width: var(--control); padding: 0; }

/* 2. Pill */
.pill { display: inline-flex; align-items: center; gap: var(--space-8); min-height: 40px; padding-inline: var(--space-16); border-radius: var(--radius-pill); font-size: var(--text-caption); font-weight: ${font.weight.semibold}; background: color-mix(in srgb, var(--ink) 8%, var(--surface)); color: var(--ink-muted); text-decoration: none; }
.pill-pass { background: color-mix(in srgb, var(--pass) var(--tint), var(--surface)); color: var(--pass); }
.pill-fail { background: color-mix(in srgb, var(--fail) var(--tint), var(--surface)); color: var(--fail); }
.pill-defer { background: color-mix(in srgb, var(--defer) var(--tint), var(--surface)); color: var(--defer); }
.pill-brand { background: color-mix(in srgb, var(--brand) var(--tint), var(--surface)); color: var(--brand); }
.pill-lg { min-height: 56px; padding-inline: var(--space-32); font-size: var(--text-body); }

/* 3. Card */
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-32); }
.card-flush { padding: 0; }

/* 4. Row */
.row { display: flex; align-items: center; gap: var(--space-16); min-height: var(--row); padding: var(--space-16) var(--space-32); border-bottom: 1px solid var(--border); }
.row:last-child { border-bottom: 0; }
.row > .grow { flex: 1; min-width: 0; }
.row > .ic { color: var(--brand); }

/* 5. Table */
.table { width: 100%; border-collapse: collapse; }
.table th { text-align: left; font-size: var(--text-caption); font-weight: ${font.weight.semibold}; color: var(--ink-muted); padding: var(--space-16) var(--space-32); border-bottom: 2px solid var(--border); white-space: nowrap; }
.table td { height: var(--row); padding: var(--space-16) var(--space-32); border-bottom: 1px solid var(--border); vertical-align: middle; }
.table tr:last-child td { border-bottom: 0; }
.table tbody tr:hover td { background: color-mix(in srgb, var(--ink) 4%, var(--surface)); }
.table .num { text-align: right; }

/* 6. Input */
.field { display: flex; flex-direction: column; gap: var(--space-8); }
.field label { font-size: var(--text-caption); font-weight: ${font.weight.semibold}; color: var(--ink-muted); }
.input { min-height: var(--control); padding: var(--space-8) var(--space-16); border-radius: var(--radius); border: 2px solid var(--border); background: var(--surface); width: 100%; }
.input:focus { border-color: var(--brand); box-shadow: none; outline: none; }
textarea.input { min-height: 120px; resize: vertical; }

/* 7. Key */
.kbd { display: inline-flex; align-items: center; justify-content: center; min-width: 40px; height: 40px; padding-inline: var(--space-8); border-radius: 8px; border: 2px solid var(--border); border-bottom-width: 4px; background: var(--surface); color: var(--ink); font-family: var(--font-mono); font-size: var(--text-caption); font-weight: ${font.weight.semibold}; }

/* Shell. Neutral surfaces, hairline borders, quiet chrome. */

/* 8. Rail */
.rail { display: flex; flex-direction: column; align-items: center; gap: var(--space-8); width: var(--rail); padding-block: var(--space-16); background: var(--surface); border-right: 1px solid var(--border); }
.rail-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border: 0; border-radius: 12px; background: transparent; color: var(--ink-muted); text-decoration: none; cursor: pointer; transition: background var(--duration), color var(--duration); }
.rail-btn:hover { color: var(--ink); background: color-mix(in srgb, var(--ink) 6%, transparent); }
.rail-btn[aria-current="page"] { color: var(--brand); background: color-mix(in srgb, var(--brand) var(--tint), var(--surface)); }
.avatar { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; flex: none; border-radius: var(--radius-pill); background: color-mix(in srgb, var(--brand) var(--tint), var(--surface)); color: var(--brand); font-size: var(--text-caption); font-weight: ${font.weight.semibold}; text-decoration: none; text-transform: uppercase; }

/* 9. Two-line nav item */
.nav2 { display: flex; align-items: center; gap: var(--space-16); min-height: 64px; padding: var(--space-8) var(--space-16); border-radius: 12px; color: var(--ink); text-decoration: none; }
.nav2:hover { background: color-mix(in srgb, var(--ink) 4%, transparent); }
.nav2 > .ic, .nav2 > .dot { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; flex: none; border-radius: var(--radius-pill); background: color-mix(in srgb, var(--ink) 6%, var(--surface)); color: var(--ink-muted); }
.nav2 > .dot > .ic { width: var(--icon-sm); height: var(--icon-sm); }
.nav2 .label { display: block; font-size: var(--text-caption); font-weight: ${font.weight.semibold}; line-height: var(--lh-caption); }
.nav2 .meta { display: block; font-size: var(--text-caption); line-height: var(--lh-caption); color: var(--ink-muted); font-variant-numeric: tabular-nums; }
.nav2[aria-current="page"] { background: color-mix(in srgb, var(--brand) var(--tint), var(--surface)); }
.nav2[aria-current="page"] > .dot { background: var(--surface); color: var(--brand); }

/* 10. Tabs */
.tabs { display: flex; gap: var(--space-8); border-bottom: 1px solid var(--border); overflow-x: auto; scrollbar-width: none; }
.tab { display: inline-flex; align-items: center; gap: var(--space-8); min-height: var(--control-compact); padding-inline: var(--space-16); margin-bottom: -1px; border-bottom: 2px solid transparent; color: var(--ink-muted); font-size: var(--text-caption); font-weight: ${font.weight.semibold}; text-decoration: none; white-space: nowrap; }
.tab:hover { color: var(--ink); }
.tab[aria-current="page"] { color: var(--ink); border-bottom-color: var(--brand); }
.tab .count { color: var(--ink-muted); font-weight: ${font.weight.regular}; font-variant-numeric: tabular-nums; }

/* 11. Aside */
.aside { display: flex; flex-direction: column; gap: var(--space-32); width: var(--aside); flex: none; padding: var(--space-16); background: var(--surface); border-left: 1px solid var(--border); }
.aside-wide { width: calc(var(--aside) * 1.5); }
.aside h2 { font-size: var(--text-caption); font-weight: ${font.weight.semibold}; line-height: var(--lh-caption); color: var(--ink-muted); }

/* 12. Property row */
.prop { display: grid; grid-template-columns: 104px minmax(0, 1fr); align-items: center; gap: var(--space-16); min-height: var(--control-compact); font-size: var(--text-caption); }
.prop > dt, .prop > .key { color: var(--ink-muted); }
.prop > dd, .prop > .value { margin: 0; min-width: 0; overflow-wrap: anywhere; }

/* 13. Status bar */
.statusbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-8) var(--space-16); min-height: var(--statusbar); padding-inline: var(--space-16); border-top: 1px solid var(--border); background: var(--surface); color: var(--ink-muted); font-size: var(--text-caption); line-height: var(--lh-caption); }
.statusbar > * { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--space-16); }

/* 14. State circle: open hollow, confirmed filled brand, dismissed slashed */
.state { position: relative; display: inline-block; width: var(--icon-sm); height: var(--icon-sm); flex: none; border: 2px solid var(--ink-muted); border-radius: var(--radius-pill); }
.state-confirmed { background: var(--brand); border-color: var(--brand); }
.state-dismissed { border-color: color-mix(in srgb, var(--ink-muted) 60%, transparent); }
.state-dismissed::after { content: ""; position: absolute; top: 50%; left: -2px; right: -2px; height: 2px; background: color-mix(in srgb, var(--ink-muted) 60%, transparent); transform: translateY(-50%) rotate(-45deg); }

/* 15. List row */
.list-row { display: flex; align-items: center; gap: var(--space-16); min-height: var(--row-list); padding-inline: var(--space-16); border-bottom: 1px solid var(--border); color: inherit; text-decoration: none; }
.list-row:last-child { border-bottom: 0; }
.list-row:hover, .list-row[data-focus] { background: color-mix(in srgb, var(--ink) 4%, var(--surface)); }
.list-row[data-focus] { box-shadow: inset 2px 0 0 var(--brand); }
.list-row > .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list-row > .meta { display: inline-flex; align-items: center; gap: 4px; color: var(--ink-muted); font-size: var(--text-caption); white-space: nowrap; }

/* Bar (goes inside a card or row) */
.bar { position: relative; height: 12px; border-radius: var(--radius-pill); background: color-mix(in srgb, var(--ink) 8%, var(--surface)); overflow: hidden; }
.bar > i { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: var(--brand); }
.bar-pass > i { background: var(--pass); }
.bar-fail > i { background: var(--fail); }
`;
}
