/**
 * Generates CSS from the tokens. Three outputs:
 * - `tokensCss()`     custom properties for light, dark, and every font pair
 * - `baseCss()`       resets, text styles, layout primitives
 * - `componentsCss()` the component classes the contracts in components.ts describe
 *
 * Theme handling: bare `:root` holds the light palette, dark overrides apply
 * for `prefers-color-scheme: dark` unless `data-theme="light"` is set, and
 * `data-theme="dark"` forces dark.
 */

import { light, dark, type SemanticColors } from './tokens/color.ts';
import {
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight,
  textStyle,
  fontPairs,
  defaultFontPairId,
  fontFeatures,
  type FontSizeToken,
} from './tokens/typography.ts';
import { space, radius, shadow, motion, iconSize, density, container } from './tokens/layout.ts';

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

function colorVars(theme: SemanticColors): string {
  return Object.entries(theme)
    .map(([k, v]) => `  --color-${kebab(k)}: ${v};`)
    .join('\n');
}

function fontPairVars(id: string): string {
  const pair = fontPairs.find((p) => p.id === id);
  if (!pair) throw new Error(`Unknown font pair: ${id}`);
  return [
    `  --font-heading: ${pair.heading};`,
    `  --font-body: ${pair.body};`,
    `  --font-mono: ${pair.mono};`,
  ].join('\n');
}

export function tokensCss(): string {
  const sizes = (Object.keys(fontSize) as FontSizeToken[])
    .map(
      (k) =>
        `  --text-${k}: ${fontSize[k]}px;\n  --leading-${k}: ${lineHeight[k]};\n  --tracking-${k}: ${letterSpacing[k]};`,
    )
    .join('\n');
  const spaces = Object.entries(space)
    .map(([k, v]) => `  --space-${k}: ${v}px;`)
    .join('\n');
  const radii = Object.entries(radius)
    .map(([k, v]) => `  --radius-${k}: ${v}px;`)
    .join('\n');
  const shadows = Object.entries(shadow)
    .map(([k, v]) => `  --shadow-${k}: ${v};`)
    .join('\n');
  const icons = Object.entries(iconSize)
    .map(([k, v]) => `  --icon-${k}: ${v}px;`)
    .join('\n');
  const dens = Object.entries(density)
    .filter(([k, v]) => typeof v === 'number' && !k.startsWith('max'))
    .map(([k, v]) => `  --${kebab(k)}: ${v}px;`)
    .join('\n');
  const containers = Object.entries(container)
    .map(([k, v]) => `  --container-${k}: ${v}px;`)
    .join('\n');
  const pairBlocks = fontPairs
    .map((p) => `:root[data-font="${p.id}"] {\n${fontPairVars(p.id)}\n}`)
    .join('\n');
  const fontFaces = fontPairs
    .map((p) => p.fontFace ?? '')
    .filter(Boolean)
    .join('\n');

  return `${fontFaces}
:root {
${colorVars(light)}
${sizes}
${spaces}
${radii}
${shadows}
${icons}
${dens}
${containers}
  --duration-fast: ${motion.duration.fast};
  --duration-base: ${motion.duration.base};
  --duration-slow: ${motion.duration.slow};
  --ease-standard: ${motion.easing.standard};
  --ease-enter: ${motion.easing.enter};
  --ease-exit: ${motion.easing.exit};
  --font-features-numeric: ${fontFeatures.numeric};
  --font-features-default: ${fontFeatures.default};
${fontPairVars(defaultFontPairId)}
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${colorVars(dark)}
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${colorVars(dark)}
  color-scheme: dark;
}
${pairBlocks}
`;
}

export function baseCss(): string {
  const styles = Object.entries(textStyle)
    .map(([name, s]) => {
      const family = s.family === 'heading' ? 'var(--font-heading)' : 'var(--font-body)';
      const weight = fontWeight[s.weight];
      return `.t-${name} { font-family: ${family}; font-size: var(--text-${s.size}); line-height: var(--leading-${s.size}); letter-spacing: var(--tracking-${s.size}); font-weight: ${weight}; }`;
    })
    .join('\n');

  return `*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--color-canvas);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: var(--leading-body);
  font-feature-settings: var(--font-features-default);
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4, p { margin: 0; }
h1, h2, h3, h4 { text-wrap: balance; }
a { color: inherit; }
button, input, select, textarea { font: inherit; color: inherit; }
img, svg { display: block; max-width: 100%; }
[hidden] { display: none !important; }
:focus-visible { outline: none; box-shadow: var(--shadow-focus); border-radius: var(--radius-sm); }
.num { font-variant-numeric: tabular-nums lining-nums; font-feature-settings: var(--font-features-numeric); }
.mono { font-family: var(--font-mono); }
.strong { font-weight: 600; }
.heavy { font-weight: 800; }
.muted { color: var(--color-ink2); }
.faint { color: var(--color-ink3); }
.stack { display: flex; flex-direction: column; gap: var(--stack-gap, var(--space-4)); }
.cluster { display: flex; flex-wrap: wrap; align-items: center; gap: var(--cluster-gap, var(--space-3)); }
.grid { display: grid; gap: var(--card-gap); grid-template-columns: repeat(auto-fit, minmax(var(--grid-min, 260px), 1fr)); }
.container { width: 100%; max-width: var(--container-default); margin-inline: auto; padding-inline: var(--page-gutter-sm); }
@media (min-width: 900px) { .container { padding-inline: var(--page-gutter); } }
.container-wide { max-width: var(--container-wide); }
.scroll-x { overflow-x: auto; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }
${styles}
`;
}

export function componentsCss(): string {
  return `
/* Button */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-3);
  min-height: var(--control-height); padding-inline: var(--space-6);
  border-radius: var(--radius-pill); border: 2px solid transparent;
  font-family: var(--font-body); font-size: var(--text-body); font-weight: 600;
  cursor: pointer; text-decoration: none; white-space: nowrap;
  transition: background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard);
}
.btn:active { transform: translateY(1px); }
.btn-primary { background: var(--color-brand); color: var(--color-ink-inverse); }
.btn-primary:hover { background: var(--color-brand-hover); }
.btn-secondary { background: var(--color-surface); color: var(--color-ink); border-color: var(--color-border-strong); }
.btn-secondary:hover { background: var(--color-surface-hover); }
.btn-ghost { background: transparent; color: var(--color-ink2); }
.btn-ghost:hover { background: var(--color-surface-sunken); color: var(--color-ink); }
.btn-pass { background: var(--color-pass); color: var(--color-ink-inverse); }
.btn-fail { background: var(--color-fail); color: var(--color-ink-inverse); }
.btn-defer { background: var(--color-defer-soft); color: var(--color-defer-ink); }
.btn-compact { min-height: var(--control-height-compact); padding-inline: var(--space-4); font-size: var(--text-caption); }
.btn-icon { width: var(--control-height); padding: 0; }
.btn[disabled] { opacity: 0.45; cursor: not-allowed; }

/* Card */
.card { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--card-padding); border: 1px solid var(--color-border); }
.card-raised { box-shadow: var(--shadow-md); border-color: transparent; }
.card-brand { background: var(--color-brand); color: var(--color-ink-inverse); border-color: transparent; }
.card-accent { background: var(--color-accent-soft); border-color: transparent; }

/* Verdict pill */
.verdict {
  display: inline-flex; align-items: center; gap: var(--space-2);
  min-height: 40px; padding-inline: var(--space-4); border-radius: var(--radius-pill);
  font-size: var(--text-caption); font-weight: 600; letter-spacing: 0.01em;
}
.verdict-pass { background: var(--color-pass-soft); color: var(--color-pass-ink); }
.verdict-fail { background: var(--color-fail-soft); color: var(--color-fail-ink); }
.verdict-defer { background: var(--color-defer-soft); color: var(--color-defer-ink); }
.verdict-pending { background: var(--color-surface-sunken); color: var(--color-ink2); }
.verdict-lg { min-height: 56px; padding-inline: var(--space-6); font-size: var(--text-body); }

/* Stat tile */
.stat { display: flex; flex-direction: column; gap: var(--space-2); }
.stat-value { font-family: var(--font-heading); font-weight: 800; font-size: var(--text-stat); line-height: var(--leading-stat); letter-spacing: var(--tracking-stat); font-variant-numeric: tabular-nums lining-nums; }
.stat-label { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--text-caption); font-weight: 500; color: var(--color-ink2); }
.delta { display: inline-flex; align-items: center; gap: var(--space-1); font-size: var(--text-body); font-weight: 600; font-variant-numeric: tabular-nums; }
.delta-up { color: var(--color-pass-ink); }
.delta-down { color: var(--color-fail-ink); }
.delta-flat { color: var(--color-ink3); }

/* Score bar */
.bar { position: relative; height: 12px; border-radius: var(--radius-pill); background: var(--color-surface-sunken); overflow: hidden; }
.bar > i { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: var(--color-brand); }
.bar-pass > i { background: var(--color-pass); }
.bar-fail > i { background: var(--color-fail); }

/* Table */
.table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: var(--text-body); }
.table th { text-align: left; font-size: var(--text-caption); font-weight: 600; color: var(--color-ink2); letter-spacing: 0.01em; padding: var(--space-4) var(--space-6); border-bottom: 2px solid var(--color-border); white-space: nowrap; }
.table td { height: var(--table-row); padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--color-border); vertical-align: middle; }
.table tr:last-child td { border-bottom: 0; }
.table tbody tr:hover td { background: var(--color-surface-hover); }
.table .num { text-align: right; }
.table .baseline th, .table .baseline td { background: var(--color-surface-sunken); }
.cell-diff { display: inline-flex; align-items: center; gap: var(--space-2); font-weight: 600; }

/* Nav */
.nav { display: flex; flex-direction: column; gap: var(--space-1); }
.nav a { display: flex; align-items: center; gap: var(--space-3); min-height: var(--control-height); padding-inline: var(--space-4); border-radius: var(--radius-md); text-decoration: none; color: var(--color-ink2); font-weight: 500; }
.nav a:hover { background: var(--color-surface-sunken); color: var(--color-ink); }
.nav a[aria-current="page"] { background: var(--color-brand-soft); color: var(--color-brand-ink); font-weight: 600; }

/* Tabs */
.tabs { display: flex; gap: var(--space-2); border-bottom: 2px solid var(--color-border); }
.tabs button { min-height: var(--control-height); padding-inline: var(--space-4); border: 0; background: none; color: var(--color-ink2); font-weight: 600; border-bottom: 3px solid transparent; margin-bottom: -2px; cursor: pointer; }
.tabs button[aria-selected="true"] { color: var(--color-ink); border-color: var(--color-brand); }

/* Inputs */
.field { display: flex; flex-direction: column; gap: var(--space-2); }
.field label { font-size: var(--text-caption); font-weight: 600; color: var(--color-ink2); }
.input { min-height: var(--control-height); padding-inline: var(--space-4); border-radius: var(--radius-md); border: 2px solid var(--color-border-strong); background: var(--color-surface); width: 100%; }
.input:focus { border-color: var(--color-brand); box-shadow: none; outline: none; }
textarea.input { min-height: 120px; padding-block: var(--space-3); resize: vertical; }

/* Toggle */
.toggle { position: relative; width: 64px; height: 36px; border-radius: var(--radius-pill); background: var(--color-border-strong); border: 0; cursor: pointer; transition: background var(--duration-fast); }
.toggle::after { content: ""; position: absolute; top: 4px; left: 4px; width: 28px; height: 28px; border-radius: 50%; background: var(--color-surface); box-shadow: var(--shadow-sm); transition: transform var(--duration-fast) var(--ease-standard); }
.toggle[aria-checked="true"] { background: var(--color-brand); }
.toggle[aria-checked="true"]::after { transform: translateX(28px); }

/* Keyboard key */
.kbd { display: inline-flex; align-items: center; justify-content: center; min-width: 40px; height: 40px; padding-inline: var(--space-3); border-radius: var(--radius-sm); border: 2px solid var(--color-border-strong); border-bottom-width: 4px; background: var(--color-surface); font-family: var(--font-mono); font-size: var(--text-caption); font-weight: 600; }

/* Segmented control */
.segmented { display: inline-flex; padding: 4px; border-radius: var(--radius-pill); background: var(--color-surface-sunken); gap: 4px; }
.segmented button { min-height: 48px; padding-inline: var(--space-4); border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--color-ink2); font-weight: 600; cursor: pointer; }
.segmented button[aria-pressed="true"] { background: var(--color-surface); color: var(--color-ink); box-shadow: var(--shadow-sm); }

/* Empty state */
.empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-6); padding: var(--space-16) var(--space-8); }
.empty svg { width: var(--icon-xl); height: var(--icon-xl); color: var(--color-brand); }
`;
}

export function allCss(): string {
  return `${tokensCss()}\n${baseCss()}\n${componentsCss()}`;
}
