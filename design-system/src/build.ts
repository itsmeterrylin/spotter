/**
 * Build script.
 *   node --experimental-strip-types src/build.ts
 *
 * Writes:
 *   dist/tokens.css     tokens only
 *   dist/system.css     tokens + base + components
 *   dist/tokens.json    tokens as data
 *   preview/index.html  preview/template.html with the CSS and icons inlined
 *   dist/artifact.html  same page without the document skeleton
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensCss, allCss } from './css.ts';
import { icon, iconNames, type IconName } from './icons.ts';
import * as tokens from './tokens/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

writeFileSync(join(dist, 'tokens.css'), tokensCss());
writeFileSync(join(dist, 'system.css'), allCss());
writeFileSync(
  join(dist, 'tokens.json'),
  JSON.stringify(
    {
      palette: tokens.palette,
      themes: tokens.themes,
      fontSize: tokens.fontSize,
      lineHeight: tokens.lineHeight,
      fontWeight: tokens.fontWeight,
      fontPairs: tokens.fontPairs.map(({ fontFace: _omit, ...p }) => p),
      space: tokens.space,
      radius: tokens.radius,
      shadow: tokens.shadow,
      motion: tokens.motion,
      iconSize: tokens.iconSize,
      breakpoint: tokens.breakpoint,
      container: tokens.container,
      density: tokens.density,
    },
    null,
    2,
  ),
);

const template = readFileSync(join(root, 'preview', 'template.html'), 'utf8');
const fontLinks = tokens.fontPairs
  .filter((p) => p.googleFontsUrl)
  .map((p) => `<link rel="stylesheet" href="${p.googleFontsUrl}">`)
  .join('\n');
const fontPairJson = JSON.stringify(tokens.fontPairs.map(({ id, label }) => ({ id, label })));
const iconSprite = `<svg hidden aria-hidden="true">${iconNames
  .map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24">${icon(n).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</symbol>`)
  .join('')}</svg>`;

/** Self-hosted faces become data URIs so the page is one portable file. */
const inlineFonts = (css: string): string =>
  css.replace(/url\("fonts\/([^"]+)"\)/g, (_m, file: string) => {
    const bytes = readFileSync(join(root, 'preview', 'fonts', file));
    return `url("data:font/otf;base64,${bytes.toString('base64')}")`;
  });

const body = template
  .replace('<!-- FONT_LINKS -->', fontLinks)
  .replace('/* SYSTEM_CSS */', inlineFonts(allCss()))
  .replace('/* FONT_PAIRS_JSON */', fontPairJson)
  .replace('<!-- ICON_SPRITE -->', iconSprite);

writeFileSync(join(root, 'preview', 'index.html'), `<!doctype html>\n<html lang="en">\n${body}\n</html>\n`);
writeFileSync(join(dist, 'artifact.html'), body.replace(/<head>|<\/head>|<body>|<\/body>/g, ''));

const used = new Set<IconName>();
for (const m of template.matchAll(/#i-([a-z]+)/g)) used.add(m[1] as IconName);
const unknown = [...used].filter((n) => !iconNames.includes(n));
if (unknown.length) throw new Error(`Template uses unknown icons: ${unknown.join(', ')}`);

console.log(`built ${dist} and preview/index.html (${used.size} icons used)`);
