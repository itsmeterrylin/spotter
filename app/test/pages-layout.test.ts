import { beforeAll, describe, expect, test } from 'bun:test';
import { notifications } from '../src/services/notifications.ts';
import { page, pageApp, type PageSeed, seedPages, send } from './helpers.ts';

const { app, repos } = pageApp();
const base = 'http://localhost:3000';
const badge = (html: string): number => Number(/class="badge">(\d+)</.exec(html)?.[1] ?? 0);

describe('layout before any data', () => {
  test('the notifications page shows All clear and the bell has no badge', async () => {
    const [status, html] = await page(app, '/notifications');
    expect(status).toBe(200);
    expect(html).toContain('All clear');
    expect(html).not.toContain('class="badge"');
    expect(html).toContain('<a class="nav2" href="http://localhost:3000/runs">');
    expect(html).toContain('<div class="project-row"><span>No project yet</span></div>');
  });
});

describe('layout', () => {
  let s: PageSeed;
  beforeAll(async () => {
    s = await seedPages(app);
  });

  test('the shell renders rail, sidebar with live counts, tabs, and status bar, with Issues active on /', async () => {
    const [status, html] = await page(app, '/');
    expect(status).toBe(200);
    for (const cls of ['<nav class="rail" aria-label="App">', '<aside class="sidebar">', '<nav class="tabs" aria-label="Tabs">', '<footer class="statusbar">']) expect(html).toContain(cls);
    for (const path of ['traces', 'judges', 'runs', 'datasets']) expect(html).toContain(`<a class="nav2" href="${base}/${path}">`);
    expect(html).toContain(`<a class="nav2" href="${base}/" aria-current="page"><svg class="ic ic-sm" aria-hidden="true"><use href="#i-issue"/></svg><span class="label">Issues</span><span class="meta" title="Open issues">0</span></a>`);
    expect(html).toContain('<span class="label">Traces</span><span class="meta" title="Traces">6</span>');
    expect(html).toContain('<span class="label">Judges</span><span class="meta" title="Active judges">0</span>');
    expect(html).toContain('<span class="label">Runs</span><span class="meta" title="Runs">2</span>');
    expect(html).toContain('<span class="label">Datasets</span><span class="meta" title="Datasets">1</span>');
    expect(html).toContain(`<a class="rail-btn" href="${base}/" aria-label="Issues" title="Issues" aria-current="page">`);
    expect(html).toContain(`<a class="rail-btn" href="${base}/traces#sidebar-search" aria-label="Search" title="Search" data-search="true">`);
    expect(html).toContain('<input class="input" id="sidebar-search" type="search" name="q" placeholder="Search traces" aria-label="Search traces"/>');
    expect(html).toContain('<span class="avatar rail-foot" title="copper">co</span>');
    expect(html).toContain('<div class="project-row"><span>copper</span></div>');
    expect(html).toContain('<span><span>copper</span><span class="build">v0.1.0</span></span>');
    expect(html).toContain(`<a href="${base}/traces?tab=unlabeled">5 unlabeled</a>`);
    expect(html).toContain(`<span class="mcp" title="${base}/mcp"><i class="live" aria-hidden="true"></i>MCP localhost:3000/mcp</span>`);
    expect(html).toContain('id="nav-toggle"');
    expect(html).toContain('aria-label="Menu"');
    expect(html).toContain('<h1 class="t-title">Issues</h1>');
    expect(html).not.toContain('class="aside');
    expect(html).toContain('/pages.css');
    expect(html).toContain('<symbol id="i-paw"');
    expect(html).toContain('<link rel="icon" href="/favicon.svg"');
    expect(html).toContain('Datasets');
    expect(html).toContain('Judges');
    expect(html).toContain('Traces');
  });

  test('each section page marks its own nav item active', async () => {
    for (const path of ['/runs', '/datasets', '/traces', '/judges']) {
      const [status, html] = await page(app, path);
      expect(status).toBe(200);
      expect(html).toContain(`<a class="nav2" href="${base}${path}" aria-current="page">`);
    }
  });

  test('/traces?q= searches transcript text and ?tab=unlabeled keeps traces without a human label', async () => {
    const [, all] = await page(app, '/traces');
    expect(all.match(/<tr class="linkrow"/g)?.length).toBe(6);
    expect(all).toContain('<a class="tab" href="http://localhost:3000/traces" aria-current="page">All</a>');
    const [, found] = await page(app, '/traces?q=squat');
    expect(found.match(/<tr class="linkrow"/g)?.length).toBe(1);
    expect(found).toContain('<span class="pill"><svg class="ic ic-sm" aria-hidden="true"><use href="#i-search"/></svg>squat</span>');
    const [, none] = await page(app, '/traces?q=nothing-matches');
    expect(none).toContain('No matches');
    const [, unlabeled] = await page(app, '/traces?tab=unlabeled');
    expect(unlabeled.match(/<tr class="linkrow"/g)?.length).toBe(5);
    expect(unlabeled).toContain('<a class="tab" href="http://localhost:3000/traces?tab=unlabeled" aria-current="page">Unlabeled</a>');
  });

  test('the bell links to notifications and its badge equals the notifications count', async () => {
    const [, html] = await page(app, '/');
    expect(html).toContain(`<a class="rail-btn" href="${base}/notifications" aria-label="Notifications" title="Notifications">`);
    const items = notifications(repos);
    expect(items.length).toBeGreaterThan(0);
    expect(badge(html)).toBe(items.length);
    const [, list] = await page(app, '/notifications');
    expect(list.match(/data-kind="/g)?.length).toBe(items.length);
  });

  test('notifications rows carry one button each with a deep link', async () => {
    const [status, html] = await page(app, '/notifications');
    expect(status).toBe(200);
    expect(html).toContain('<span class="strong num">1</span> regressions <span class="muted">· rules-v2 vs rules-v1</span>');
    expect(html).toContain(`href="${base}/datasets/${s.datasetId}/compare?runs=${s.runA}%2C${s.runB}&amp;only=changes">Verify</a>`);
    expect(html).toContain('<span class="strong num">2</span> unlabeled <span class="muted">· rules-v2</span>');
    expect(html).toContain(`href="${base}/review?run=${s.runB}&amp;filter=unlabeled">Label</a>`);
    expect(html).toContain('<span class="strong num">3</span> unlabeled <span class="muted">· rules-v1</span>');
    expect(html).not.toContain('traces done');
    expect(html).toContain(`<a class="rail-btn" href="${base}/notifications" aria-label="Notifications" title="Notifications" aria-current="page">`);
  });

  test('a run that ended in the last day shows as completed', async () => {
    await send(app, 'PATCH', `/api/runs/${s.runB}`, {});
    const [, html] = await page(app, '/notifications');
    expect(html).toContain('<span class="strong num">3</span> traces done <span class="muted">· rules-v2</span>');
    expect(html).toContain(`href="${base}/runs/${s.runB}">Open</a>`);
    expect(notifications(repos, Date.now() + 25 * 60 * 60 * 1000).some((n) => n.kind === 'completed')).toBe(false);
  });

  test('/inbox redirects for good to /notifications', async () => {
    const res = await app.request('/inbox');
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe(`${base}/notifications`);
  });

  test('serves the paw favicon and redirects /favicon.ico to it', async () => {
    const svg = await app.request('/favicon.svg');
    expect(svg.status).toBe(200);
    expect(svg.headers.get('content-type')).toContain('image/svg+xml');
    expect(await svg.text()).toContain('<svg');
    const ico = await app.request('/favicon.ico');
    expect(ico.status).toBe(302);
    expect(ico.headers.get('location')).toBe('/favicon.svg');
  });

  test('links are muted with no underline at rest, titles are primary, and underline appears on hover only', async () => {
    const css = await (await app.request('/spotter.css')).text();
    expect(css).toContain('.link { color: var(--ink-muted); font-weight: 450; text-decoration: none;');
    expect(css).toContain('.link:hover { color: var(--ink); text-decoration: underline; }');
    expect(css).toContain('.link-title { color: var(--ink); font-weight: 500; }');
    const pages = await (await app.request('/pages.css')).text();
    expect(pages).toContain('a.row-link { color: var(--ink); text-decoration: none; }');
    expect(pages).toContain('a.row-link:hover { text-decoration: underline;');
    const [, runs] = await page(app, '/runs');
    expect(runs).not.toContain('pill-brand');
  });

  test('section labels lay out icon and text on one line, flush with the content', async () => {
    const pages = await (await app.request('/pages.css')).text();
    expect(pages).toContain('.block-label { display: flex; align-items: center; gap: var(--space-6); padding-inline: 0;');
  });

  test('serves pages.css and the built client modules', async () => {
    const css = await app.request('/pages.css');
    expect(css.status).toBe(200);
    const text = await css.text();
    expect(text).toContain('.verdict-row');
    expect(text).toContain('.sidebar');
    expect(text).toContain('grid-template-columns: var(--rail) var(--sidebar) minmax(0, 1fr)');
    expect(text).toContain('@media (max-width: 1199px)');
    expect(text).toContain('@media (max-width: 899px)');
    const review = await app.request('/client/review.js');
    expect(review.status).toBe(200);
    expect(review.headers.get('content-type')).toContain('javascript');
    expect(await review.text()).toContain('keydown');
    expect((await app.request('/client/compare.js')).status).toBe(200);
    expect(await (await app.request('/client/issues.js')).text()).toContain('row-dismiss');
    expect(await (await app.request('/client/issue.js')).text()).toContain('data-dismiss-form');
    expect(await (await app.request('/client/judge.js')).text()).toContain('data-description');
    expect(await (await app.request('/client/judges.js')).text()).toContain('data-bulk-bar');
    for (const name of ['issues', 'issue', 'judges', 'judge']) {
      const bundle = await (await app.request(`/client/${name}.js`)).text();
      for (const hook of ['data-status-trigger', 'statusmenu:pick', '/api/judges/']) expect(bundle).toContain(hook);
    }
    expect(await (await app.request('/client/trace.js')).text()).toContain('/api/issues');
    expect(await (await app.request('/client/rows.js')).text()).toContain('linkrow');
    expect((await app.request('/client/nope.js')).status).toBe(404);
  });

  test('error pages keep the sidebar and offer the runs list', async () => {
    const [status, html] = await page(app, '/runs/nope');
    expect(status).toBe(404);
    expect(html).toContain('Not here');
    expect(html).toContain('<aside class="sidebar">');
    expect(html).toContain(`href="${base}/runs">Runs</a>`);
  });
});
