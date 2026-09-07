/**
 * Build.
 *   node --experimental-strip-types src/build.ts
 *
 * Writes dist/spotter.css, dist/tokens.json, preview/index.html,
 * preview/prototype.html, and dist/*.artifact.html (no document skeleton).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { css } from './css.ts';
import { icon, iconNames, type IconName } from './icons.ts';
import * as tokens from './tokens.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

const system = css();
writeFileSync(join(dist, 'spotter.css'), system);
writeFileSync(join(dist, 'tokens.json'), JSON.stringify({ color: tokens.color, font: tokens.font, space: tokens.space, radius: tokens.radius, duration: tokens.duration, iconSize: tokens.iconSize, size: tokens.size }, null, 2));

const fontLink = `<link rel="stylesheet" href="${tokens.font.googleFontsUrl}">`;
const sprite = `<svg hidden aria-hidden="true">${iconNames
  .map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24">${icon(n).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</symbol>`)
  .join('')}</svg>`;

const PLAN_URL_LOCAL = '../dist/docs/plan.html';
const PLAN_URL_PUBLISHED = 'https://claude.ai/code/artifact/c631c3f9-3e70-41a4-93af-4ec80c604329';
const PROTOTYPE_URL_LOCAL = 'prototype.html';
const PROTOTYPE_URL_PUBLISHED = 'https://claude.ai/code/artifact/308b0574-1084-43cc-945b-edb39b45c4a5';

const pages: Record<string, string> = { index: 'template.html', prototype: 'prototype.template.html' };
const used = new Set<IconName>();

for (const [name, file] of Object.entries(pages)) {
  const template = readFileSync(join(root, 'preview', file), 'utf8');
  const body = template.replace('<!-- FONT_LINKS -->', fontLink).replace('/* SYSTEM_CSS */', system).replace('<!-- ICON_SPRITE -->', sprite);
  const local = body.replace('<!-- PLAN_URL -->', PLAN_URL_LOCAL).replace('<!-- PROTOTYPE_URL -->', PROTOTYPE_URL_LOCAL);
  const published = body.replace('<!-- PLAN_URL -->', PLAN_URL_PUBLISHED).replace('<!-- PROTOTYPE_URL -->', PROTOTYPE_URL_PUBLISHED);
  writeFileSync(join(root, 'preview', `${name}.html`), `<!doctype html>\n<html lang="en">\n${local}\n</html>\n`);
  writeFileSync(join(dist, `${name === 'index' ? 'artifact' : name + '.artifact'}.html`), published.replace(/<head>|<\/head>|<body>|<\/body>/g, ''));
  for (const m of template.matchAll(/#i-([a-z]+)/g)) used.add(m[1] as IconName);
  for (const m of template.matchAll(/icon\('([a-z]+)'/g)) used.add(m[1] as IconName);
}

const unknown = [...used].filter((n) => !iconNames.includes(n));
if (unknown.length) throw new Error(`Templates use unknown icons: ${unknown.join(', ')}`);

console.log(`built dist/spotter.css (${(system.length / 1024).toFixed(1)} KB, ${(system.match(/^\.[a-z]/gm) ?? []).length} classes), preview/index.html, preview/prototype.html`);
