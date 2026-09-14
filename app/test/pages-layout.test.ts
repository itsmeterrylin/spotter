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
    expect(html).toContain('class="nav-item" href="http://localhost:3000/runs"');
  });
});

describe('layout', () => {
  let s: PageSeed;
  beforeAll(async () => {
    s = await seedPages(app);
  });

  test('the sidebar lists the four sections, marks the active one, and shows the version', async () => {
    const [status, html] = await page(app, '/');
    expect(status).toBe(200);
    for (const [path, label] of [['runs', 'Runs'], ['datasets', 'Datasets'], ['traces', 'Traces'], ['judges', 'Judges']]) expect(html).toContain(`href="${base}/${path}"`);
    expect(html).toContain('class="nav-item pill-brand" href="http://localhost:3000/runs" aria-current="page"');
    expect(html).toContain('class="nav-item" href="http://localhost:3000/datasets"');
    expect(html).toContain('<span class="build t-caption">v0.1.0</span>');
    expect(html).toContain('id="nav-toggle"');
    expect(html).toContain('aria-label="Menu"');
    expect(html).toContain('<h1 class="t-title heavy">Runs</h1>');
    expect(html).toContain('/pages.css');
    expect(html).toContain('<symbol id="i-paw"');
    expect(html).toContain('<link rel="icon" href="/favicon.svg"');
    expect(html).toContain('Datasets');
    expect(html).toContain('Judges');
    expect(html).toContain('Traces');
  });

  test('each section page marks its own nav item active', async () => {
    for (const path of ['/datasets', '/traces', '/judges']) {
      const [status, html] = await page(app, path);
      expect(status).toBe(200);
      expect(html).toContain(`class="nav-item pill-brand" href="${base}${path}"`);
    }
  });

  test('the bell links to notifications and its badge equals the notifications count', async () => {
    const [, html] = await page(app, '/');
    expect(html).toContain(`<a class="btn btn-ghost btn-icon bell" href="${base}/notifications" aria-label="Notifications">`);
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
    expect(html).toContain('class="nav-item" href="http://localhost:3000/runs"');
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

  test('serves pages.css and the built client modules', async () => {
    const css = await app.request('/pages.css');
    expect(css.status).toBe(200);
    const text = await css.text();
    expect(text).toContain('.verdict-row');
    expect(text).toContain('.sidebar');
    expect(text).toContain('grid-template-columns: 240px');
    expect(text).toContain('@media (max-width: 899px)');
    const review = await app.request('/client/review.js');
    expect(review.status).toBe(200);
    expect(review.headers.get('content-type')).toContain('javascript');
    expect(await review.text()).toContain('keydown');
    expect((await app.request('/client/compare.js')).status).toBe(200);
    expect(await (await app.request('/client/rows.js')).text()).toContain('linkrow');
    expect((await app.request('/client/nope.js')).status).toBe(404);
  });

  test('error pages keep the sidebar and offer the runs list', async () => {
    const [status, html] = await page(app, '/runs/nope');
    expect(status).toBe(404);
    expect(html).toContain('Not here');
    expect(html).toContain('class="sidebar"');
    expect(html).toContain(`href="${base}/runs">Runs</a>`);
  });
});
