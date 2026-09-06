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
.doc .diagram-view { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-6); overflow: auto; cursor: zoom-in; -webkit-overflow-scrolling: touch; min-height: 120px; }
.doc .diagram-view:focus-visible { box-shadow: var(--shadow-focus); outline: none; }
.doc .diagram-view svg { max-width: none !important; display: block; }
.doc .diagram-open { position: absolute; top: var(--space-3); right: var(--space-3); }
.zoom { position: fixed; inset: 0; z-index: 100; background: var(--color-canvas); display: none; flex-direction: column; }
.zoom[data-open] { display: flex; }
.zoom-bar { display: flex; gap: var(--space-3); align-items: center; padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.zoom-bar .grow { flex: 1; }
.zoom-body { flex: 1; overflow: auto; padding: var(--space-6); touch-action: pan-x pan-y pinch-zoom; cursor: grab; }
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
    return `<div class="diagram"><script type="text/plain" class="diagram-src">${decoded}</script><div class="diagram-view" tabindex="0" role="button" aria-label="Open diagram fullscreen"></div><button type="button" class="btn btn-secondary btn-compact diagram-open" data-zoom>Zoom</button></div>`;
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
<script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.12.0/mermaid.min.js"></script>
<script>
(function () {
  var MIN_WIDTH = 960;
  var css = getComputedStyle(document.documentElement);
  var v = function (name) { return css.getPropertyValue(name).trim(); };
  var dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.getAttribute('data-theme') !== 'light' || document.documentElement.getAttribute('data-theme') === 'dark';
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      fontFamily: v('--font-body'), fontSize: '16px',
      primaryColor: v('--color-brand-soft'), primaryBorderColor: v('--color-brand'), primaryTextColor: v('--color-ink'),
      secondaryColor: v('--color-surface-sunken'), tertiaryColor: v('--color-surface'),
      lineColor: v('--color-ink2'), textColor: v('--color-ink'), clusterBkg: v('--color-surface-sunken'), clusterBorder: v('--color-border-strong'),
      actorBkg: v('--color-brand-soft'), actorBorder: v('--color-brand'), actorTextColor: v('--color-ink'), signalColor: v('--color-ink2'), signalTextColor: v('--color-ink'),
      noteBkgColor: v('--color-accent-soft'), noteBorderColor: v('--color-accent'), noteTextColor: v('--color-ink'),
      labelBoxBkgColor: v('--color-surface'), labelBoxBorderColor: v('--color-border-strong'), labelTextColor: v('--color-ink'), loopTextColor: v('--color-ink2'),
      edgeLabelBackground: v('--color-surface'), darkMode: dark
    },
    flowchart: { useMaxWidth: false, htmlLabels: true, padding: 16 },
    sequence: { useMaxWidth: false, mirrorActors: false, actorMargin: 40, messageMargin: 36 }
  });

  function size(svg, scale) {
    var vb = svg.viewBox && svg.viewBox.baseVal;
    if (!vb || !vb.width) return;
    var base = Math.max(1, MIN_WIDTH / vb.width);
    svg.setAttribute('width', Math.round(vb.width * base * scale));
    svg.setAttribute('height', Math.round(vb.height * base * scale));
    svg.style.maxWidth = 'none';
  }

  var zoom = document.getElementById('zoom'), body = document.getElementById('zoomBody'), level = document.getElementById('zoomLevel');
  var scale = 1, current = null;
  function render() { if (!current) return; size(current, scale); level.textContent = Math.round(scale * 100) + '%'; }
  function open(svg) {
    current = svg.cloneNode(true); body.innerHTML = ''; body.appendChild(current); scale = 1; render();
    zoom.setAttribute('data-open', ''); document.body.style.overflow = 'hidden';
    if (zoom.requestFullscreen) zoom.requestFullscreen().catch(function () {});
    body.focus();
  }
  function close() {
    zoom.removeAttribute('data-open'); document.body.style.overflow = '';
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
  }
  function zoomBy(f) { scale = Math.min(6, Math.max(0.25, scale * f)); render(); }
  document.querySelector('[data-zoom-in]').addEventListener('click', function () { zoomBy(1.25); });
  document.querySelector('[data-zoom-out]').addEventListener('click', function () { zoomBy(1 / 1.25); });
  document.querySelector('[data-zoom-close]').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (!zoom.hasAttribute('data-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === '+' || e.key === '=') zoomBy(1.25);
    if (e.key === '-') zoomBy(1 / 1.25);
    if (e.key === '0') { scale = 1; render(); }
  });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && zoom.hasAttribute('data-open')) close(); });
  body.addEventListener('wheel', function (e) { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1); } }, { passive: false });
  body.addEventListener('dblclick', function () { zoomBy(1.5); });
  var drag = null;
  body.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') { drag = { x: e.clientX, y: e.clientY, l: body.scrollLeft, t: body.scrollTop }; body.style.cursor = 'grabbing'; } });
  body.addEventListener('pointermove', function (e) { if (drag) { body.scrollLeft = drag.l - (e.clientX - drag.x); body.scrollTop = drag.t - (e.clientY - drag.y); } });
  body.addEventListener('pointerup', function () { drag = null; body.style.cursor = 'grab'; });

  var n = 0;
  document.querySelectorAll('.diagram').forEach(function (d) {
    var src = d.querySelector('.diagram-src').textContent;
    var view = d.querySelector('.diagram-view');
    mermaid.render('diagram-' + (n++), src).then(function (out) {
      view.innerHTML = out.svg;
      var svg = view.querySelector('svg');
      size(svg, 1);
      var go = function () { open(svg); };
      view.addEventListener('click', go);
      view.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      d.querySelector('[data-zoom]').addEventListener('click', go);
    }).catch(function (err) { view.textContent = 'Diagram failed to render: ' + err.message; });
  });
})();
</script>`;
  writeFileSync(join(out, `${name}.artifact.html`), body);
  const standalone = body.replace('<main', '</head>\n<body>\n<main');
  writeFileSync(join(out, `${name}.html`), `<!doctype html>\n<html lang="en">\n<head>${standalone}\n</body>\n</html>\n`);
  console.log(`${name}: ${title} (${(body.length / 1024).toFixed(0)} KB)`);
}
