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
.doc .diagram { position: relative; margin: 0 0 var(--space-6); }
.doc pre.mermaid { background: var(--color-surface); border: 1px solid var(--color-border); padding: var(--space-6); overflow: auto; margin: 0; cursor: zoom-in; -webkit-overflow-scrolling: touch; }
.doc pre.mermaid svg { max-width: none !important; display: block; }
.doc .diagram-open { position: absolute; top: var(--space-3); right: var(--space-3); }
.zoom { position: fixed; inset: 0; z-index: 100; background: var(--color-canvas); display: none; flex-direction: column; }
.zoom[data-open] { display: flex; }
.zoom-bar { display: flex; gap: var(--space-3); align-items: center; padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.zoom-bar .grow { flex: 1; }
.zoom-body { flex: 1; overflow: auto; padding: var(--space-6); touch-action: pan-x pan-y pinch-zoom; }
.zoom-body svg { max-width: none !important; display: block; }
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
    return `<div class="diagram"><pre class="mermaid">${decoded}</pre><button type="button" class="btn btn-secondary btn-compact diagram-open" data-zoom>Zoom</button></div>`;
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
</main>
<div class="zoom" id="zoom" role="dialog" aria-label="Diagram">
  <div class="zoom-bar"><button type="button" class="btn btn-secondary btn-compact" data-zoom-out aria-label="Zoom out">−</button><button type="button" class="btn btn-secondary btn-compact" data-zoom-in aria-label="Zoom in">+</button><span class="t-caption muted" id="zoomLevel">100%</span><span class="grow"></span><button type="button" class="btn btn-primary btn-compact" data-zoom-close>Close</button></div>
  <div class="zoom-body" id="zoomBody"></div>
</div>
<script>
(function () {
  var MIN_WIDTH = 960;
  function size(svg, scale) {
    var vb = svg.viewBox && svg.viewBox.baseVal;
    if (!vb || !vb.width) return;
    var base = Math.max(1, MIN_WIDTH / vb.width);
    svg.setAttribute('width', Math.round(vb.width * base * scale));
    svg.setAttribute('height', Math.round(vb.height * base * scale));
    svg.style.maxWidth = 'none';
  }
  function fix(root) { root.querySelectorAll('pre.mermaid svg').forEach(function (s) { if (!s.dataset.sized) { s.dataset.sized = '1'; size(s, 1); } }); }
  fix(document);
  new MutationObserver(function () { fix(document); }).observe(document.body, { childList: true, subtree: true });

  var zoom = document.getElementById('zoom'), body = document.getElementById('zoomBody'), level = document.getElementById('zoomLevel');
  var scale = 1, current = null;
  function render() { if (!current) return; size(current, scale); level.textContent = Math.round(scale * 100) + '%'; }
  function open(svg) { current = svg.cloneNode(true); current.dataset.sized = '1'; body.innerHTML = ''; body.appendChild(current); scale = 1; render(); zoom.setAttribute('data-open', ''); document.body.style.overflow = 'hidden'; }
  function close() { zoom.removeAttribute('data-open'); document.body.style.overflow = ''; }
  document.querySelectorAll('.diagram').forEach(function (d) {
    var go = function () { var svg = d.querySelector('svg'); if (svg) open(svg); };
    d.querySelector('[data-zoom]').addEventListener('click', go);
    d.querySelector('pre.mermaid').addEventListener('click', go);
  });
  document.querySelector('[data-zoom-in]').addEventListener('click', function () { scale = Math.min(4, scale * 1.25); render(); });
  document.querySelector('[data-zoom-out]').addEventListener('click', function () { scale = Math.max(0.5, scale / 1.25); render(); });
  document.querySelector('[data-zoom-close]').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
</script>`;
  writeFileSync(join(out, `${name}.artifact.html`), body);
  const standalone = body.replace('<main', '</head>\n<body>\n<main') +
    `\n<script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.12.0/mermaid.min.js"></script>\n<script>mermaid.initialize({ startOnLoad: true, flowchart: { useMaxWidth: false }, sequence: { useMaxWidth: false } });</script>`;
  writeFileSync(join(out, `${name}.html`), `<!doctype html>\n<html lang="en">\n<head>${standalone}\n</body>\n</html>\n`);
  console.log(`${name}: ${title} (${(body.length / 1024).toFixed(0)} KB)`);
}
