/**
 * Renders markdown docs to HTML pages that use the design system.
 *   node --experimental-strip-types src/build-docs.ts
 * Writes dist/docs/<name>.html (standalone) and dist/docs/<name>.artifact.html
 * (no document skeleton, for publishing).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { allCss } from './css.ts';
import { fontPairs } from './tokens/typography.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..');
const out = join(root, 'dist', 'docs');
mkdirSync(out, { recursive: true });

const docs: Record<string, string> = {
  plan: join(repo, 'docs', 'plans', '2026-09-06-feature-eval-tool-skeleton.md'),
  design: join(repo, 'docs', 'design', 'eval-tool-design.md'),
};

const fontLinks = fontPairs
  .filter((p) => p.googleFontsUrl)
  .map((p) => `<link rel="stylesheet" href="${p.googleFontsUrl}">`)
  .join('\n');

const docCss = `
.doc { max-width: var(--container-narrow); margin-inline: auto; padding: var(--space-12) var(--space-6) var(--space-24); }
.doc h1 { font-size: var(--text-title); font-weight: 800; letter-spacing: var(--tracking-title); line-height: var(--leading-title); margin-bottom: var(--space-6); }
.doc h2 { font-size: var(--text-title); font-weight: 600; letter-spacing: var(--tracking-title); line-height: var(--leading-title); margin: var(--space-16) 0 var(--space-4); padding-top: var(--space-6); border-top: 1px solid var(--color-border); }
.doc h3 { font-size: var(--text-body); font-weight: 600; margin: var(--space-8) 0 var(--space-2); color: var(--color-ink2); }
.doc p, .doc li { max-width: 68ch; }
.doc p { margin: 0 0 var(--space-4); }
.doc ul, .doc ol { padding-left: var(--space-6); margin: 0 0 var(--space-4); }
.doc li { margin-bottom: var(--space-2); }
.doc strong { font-weight: 600; }
.doc code { font-family: var(--font-mono); font-size: var(--text-caption); background: var(--color-surface-sunken); padding: 2px 6px; border-radius: 6px; }
.doc pre { background: var(--color-surface-sunken); border-radius: var(--radius-md); padding: var(--space-4) var(--space-6); overflow-x: auto; margin: 0 0 var(--space-6); }
.doc pre code { background: none; padding: 0; font-size: var(--text-caption); line-height: 1.6; }
.doc pre.mermaid { background: var(--color-surface); border: 1px solid var(--color-border); padding: var(--space-6); display: flex; justify-content: center; }
.doc .scroll { overflow-x: auto; margin: 0 0 var(--space-6); }
.doc table { border-collapse: collapse; width: 100%; font-size: var(--text-caption); }
.doc th { text-align: left; font-weight: 600; color: var(--color-ink2); padding: var(--space-3) var(--space-4); border-bottom: 2px solid var(--color-border); white-space: nowrap; }
.doc td { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); vertical-align: top; }
.doc td code { white-space: nowrap; }
.doc blockquote { margin: 0 0 var(--space-4); padding-left: var(--space-4); border-left: 4px solid var(--color-brand); color: var(--color-ink2); }
.doc .meta { color: var(--color-ink3); font-size: var(--text-caption); margin-bottom: var(--space-8); }
`;

for (const [name, file] of Object.entries(docs)) {
  const md = readFileSync(file, 'utf8');
  const title = (md.match(/^# (.+)$/m)?.[1] ?? name).replace(/^Implementation plan: /, '').replace(/: system design$/, ' design');
  let html = await marked.parse(md, { gfm: true });
  html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, (_m, code: string) => {
    const decoded = code.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return `<pre class="mermaid">${decoded}</pre>`;
  });
  html = html.replace(/<table>/g, '<div class="scroll"><table>').replace(/<\/table>/g, '</table></div>');
  const body = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${fontLinks}
<style>
${allCss()}
${docCss}
</style>
<main class="doc">
${html}
</main>`;
  writeFileSync(join(out, `${name}.artifact.html`), body);
  writeFileSync(join(out, `${name}.html`), `<!doctype html>\n<html lang="en">\n<head>${body.replace('<main', '</head>\n<body>\n<main')}\n</body>\n</html>\n`);
  console.log(`${name}: ${title} (${(body.length / 1024).toFixed(0)} KB)`);
}
