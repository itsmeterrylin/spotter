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
    expect(html).toContain('<h1 class="crumb-current">Issues</h1>');
    expect(html).toContain('<header class="header">');
    expect(html).toContain('<a class="crumb" href="http://localhost:3000/">copper</a>');
    expect(html).not.toContain('<aside class="aside" ');
    expect(html).toContain('<aside class="aside pane" id="pane" aria-label="Peek" hidden="">');
    expect(html).toContain('/pages.css');
    expect(html).toContain('<symbol id="i-paw"');
    expect(html).toContain('<link rel="icon" href="/favicon.svg"');
    expect(html).toContain('Datasets');
    expect(html).toContain('Judges');
    expect(html).toContain('Traces');
  });

  test('every view renders the header bar; tabs sit in a row under it, only where a view has tabs; only detail pages title the body', async () => {
    const [, issues] = await page(app, '/');
    expect(issues.indexOf('<header class="header">')).toBeLessThan(issues.indexOf('<nav class="tabs"'));
    for (const path of ['/runs', '/datasets', '/notifications', '/settings', '/traces', '/judges', '/']) {
      const [status, html] = await page(app, path);
      expect(status).toBe(200);
      expect(html.match(/<header class="header">/g)?.length).toBe(1);
      expect(html).not.toContain('<h1 class="t-title">');
    }
    const [, runs] = await page(app, '/runs');
    expect(runs).not.toContain('<nav class="tabs"');
    const [, detail] = await page(app, `/runs/${s.runB}`);
    expect(detail).toContain('<h1 class="t-title">rules-v2</h1>');
    expect(detail).toContain('<header class="header">');
  });

  test('every object list is a .list-row list: no tables or .row blocks, one row-link per row, the shared keymap loaded', async () => {
    const lists: Array<[path: string, script: string]> = [
      ['/traces', 'traces'],
      ['/runs', 'rows'],
      ['/datasets', 'rows'],
      [`/datasets/${s.datasetId}`, 'rows'],
      [`/runs/${s.runB}`, 'rows'],
      ['/notifications', 'rows'],
      ['/settings', ''],
    ];
    for (const [path, script] of lists) {
      const [status, html] = await page(app, path);
      expect(status).toBe(200);
      expect(html).not.toContain('<table');
      expect(html).not.toContain('class="row"');
      expect(html).toContain('class="list-row"');
      if (script) expect(html).toContain(`/client/${script}.js`);
    }
    for (const name of ['rows', 'traces', 'issue', 'judge', 'trace', 'issues', 'judges']) {
      expect(await (await app.request(`/client/${name}.js`)).text()).toContain('data-focus');
    }
  });

  test('the traces list groups rows under verdict headers (failing first, then unlabeled, then passed), and each row links to its trace and still opens the pane', async () => {
    const [, html] = await page(app, '/traces');
    const heads = [...html.matchAll(/<div class="group-head">.*?<\/span>([A-Za-z]+)<span class="count">(\d+)<\/span><\/div>/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(heads).toEqual(['Failing 1', 'Unlabeled 5']);
    expect(html.match(/class="list-row" data-row="true" data-peek="\/traces\//g)?.length).toBe(6);
    for (const id of [...s.a, ...s.b]) expect(html).toContain(`<a class="grow row-link" href="${base}/traces/${id}">`);
    const [, pane] = await page(app, `/traces?trace=${s.b[0]}`);
    expect(pane).toContain(`data-peek="/traces/${s.b[0]}/pane" data-peek-id="${s.b[0]}" data-peeked="1"`);
    expect(pane).toContain('<div class="pane-inner"');
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
    expect(all.match(/class="list-row" data-row="true" data-peek="\/traces\//g)?.length).toBe(6);
    expect(all).toContain('<a class="tab" href="http://localhost:3000/traces" aria-current="page">All</a>');
    const [, found] = await page(app, '/traces?q=squat');
    expect(found.match(/class="list-row" data-row="true" data-peek="\/traces\//g)?.length).toBe(1);
    expect(found).toContain('<span class="pill"><svg class="ic ic-sm" aria-hidden="true"><use href="#i-search"/></svg>squat</span>');
    const [, none] = await page(app, '/traces?q=nothing-matches');
    expect(none).toContain('No matches');
    const [, unlabeled] = await page(app, '/traces?tab=unlabeled');
    expect(unlabeled.match(/class="list-row" data-row="true" data-peek="\/traces\//g)?.length).toBe(5);
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
    expect(text).toContain('grid-template-columns: var(--rail) var(--sidebar-w, var(--sidebar)) minmax(0, 1fr)');
    expect(text).toContain('@media (max-width: 1059px)');
    expect(text).toContain('translateX(calc(-1 * (var(--sidebar) + 16px)))');
    expect(text).toContain('@media (max-width: 899px)');
    const review = await app.request('/client/review.js');
    expect(review.status).toBe(200);
    expect(review.headers.get('content-type')).toContain('javascript');
    expect(await review.text()).toContain('verdict.pass');
    expect(await (await app.request('/client/shell.js')).text()).toContain('spotter.sidebar');
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

  test('an unknown object says what is missing and offers its own parent list', async () => {
    const cases: Array<[path: string, title: string, list: string, label: string]> = [
      ['/runs/nope', 'No run nope', 'runs', 'Runs'],
      ['/traces/nope', 'No trace nope', 'traces', 'Traces'],
      ['/datasets/nope', 'No dataset nope', 'datasets', 'Datasets'],
      ['/issues/nope', 'No issue nope', '', 'Issues'],
      ['/judges/nope', 'No judge nope', 'judges', 'Judges'],
          ];
    for (const [path, title, list, label] of cases) {
      const [status, html] = await page(app, path);
      expect(status).toBe(404);
      expect(html).toContain(`<h1 class="crumb-current">${title}</h1>`);
      expect(html).toContain('<aside class="sidebar">');
      expect(html).toContain(`<a class="btn btn-primary" href="${base}/${list}">${label}</a>`);
    }
  });

  test('an unknown route renders inside the shell with the path, while API and MCP paths keep the plain 404', async () => {
    const [status, html] = await page(app, '/no/such/page');
    expect(status).toBe(404);
    expect(html).toContain('<h1 class="crumb-current">Page not found</h1>');
    expect(html).toContain('/no/such/page');
    expect(html).toContain('<aside class="sidebar">');
    expect(html).toContain('<title>Page not found · Spotter</title>');
    const api = await app.request('/api/no/such/route');
    expect(api.status).toBe(404);
    expect(await api.text()).toBe('404 Not Found');
  });


  test('every page names its keymap view, and detail pages carry their default list', async () => {
    const cases: Array<[string, string, string | undefined]> = [
      ['/', 'list', undefined],
      ['/traces', 'list', undefined],
      [`/runs/${s.runA}`, 'detail', `${base}/runs?dataset=${s.datasetId}`],
      [`/datasets/${s.datasetId}`, 'detail', `${base}/datasets`],
      ['/settings', 'list', undefined],
    ];
    for (const [path, view, back] of cases) {
      const [status, html] = await page(app, path);
      expect(status).toBe(200);
      expect(html).toContain(`<body data-view="${view}"`);
      expect(html).toContain("localStorage.getItem('spotter.sidebar')");
      expect(html).toContain('title="Toggle sidebar ([)"');
      expect(html).toContain('title="Toggle details"');
      if (back) expect(html).toContain(`data-back="${back}"`);
      expect(html).toContain(`<script type="module" src="/client/`);
    }
  });
});
