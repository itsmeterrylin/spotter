import { beforeAll, describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db/client.ts';
import { createRepos } from '../src/db/repos/index.ts';
import { createPages } from '../src/pages/index.tsx';
import { json, send } from './helpers.ts';

const db = openDatabase(':memory:');
const repos = createRepos(db);
const app = new Hono();
app.route('/', createPages(repos));
app.route('/', createApp(db));

const base = 'http://localhost:3000';
const page = async (path: string): Promise<[number, string]> => {
  const res = await app.request(path);
  return [res.status, await res.text()];
};

beforeAll(async () => {
  await send(app, 'POST', '/api/judges/alpha/versions', { created_by: 'agent', prompt: 'a', model: 'fake:contains' });
  await send(app, 'POST', '/api/judges/beta/versions', { created_by: 'agent', prompt: 'b', model: 'fake:contains' });
  const v1 = repos.judges.getVersionByNumber('beta', 1);
  repos.judges.putCalibration({ judge_version_id: v1?.id ?? '', dataset_id: null, split: 'test', n: 20, tpr: 0.92, tnr: 0.95 });
  await send(app, 'PATCH', '/api/judges/beta', { state: 'live' });
  await send(app, 'POST', '/api/datasets', { project: 'copper', name: 'golden' });
  await send(app, 'POST', '/api/issues', { project: 'copper', title: 'Reply slips into Dutch', judge_name: 'alpha', created_by: 'agent' });
});

describe('judges list', () => {
  test('tabs carry counts and the All tab groups rows under Live then Draft headers', async () => {
    const [status, html] = await page('/judges');
    expect(status).toBe(200);
    for (const tab of [
      `<a class="tab" href="${base}/judges?state=live">Live<span class="count">1</span></a>`,
      `<a class="tab" href="${base}/judges?state=draft">Draft<span class="count">1</span></a>`,
      `<a class="tab" href="${base}/judges?state=paused">Paused<span class="count">0</span></a>`,
      `<a class="tab" href="${base}/judges" aria-current="page">All<span class="count">2</span></a>`,
    ]) expect(html).toContain(tab);
    expect(html).toContain('aria-label="Live"><svg class="ic ic-sm" aria-hidden="true"><use href="#i-stateLive"/></svg></span>Live<span class="count">1</span></div>');
    expect(html).toContain('aria-label="Draft"><svg class="ic ic-sm" aria-hidden="true"><use href="#i-stateDraft"/></svg></span>Draft<span class="count">1</span></div>');
    expect(html).not.toContain('>Paused<span class="count">0</span></div>');
    expect(html.indexOf('data-id="beta"')).toBeLessThan(html.indexOf('data-id="alpha"'));
  });

  test('rows show calibration text, or the labels still needed, and the open issue count', async () => {
    const [, html] = await page('/judges');
    expect(html).toContain('<span class="grow muted cal-text num">TPR 92% · TNR 95%</span>');
    expect(html).toContain('<span class="grow muted cal-text num">needs labels 0/100</span>');
    expect(html).toContain('<span class="meta num" title="Open issues"><svg class="ic ic-sm" aria-hidden="true"><use href="#i-issue"/></svg>1</span>');
  });

  test('the status trigger of an uncalibrated judge lists Live as disabled with the reason', async () => {
    const [, html] = await page('/judges');
    expect(html).toContain('role="menuitemradio" aria-checked="false" aria-disabled="true" title="Cannot go live: needs labels, 0 of 100 collected" data-value="live" data-label="Live">');
    expect(html).toContain('aria-disabled="true" title="Cannot move from Draft to Paused" data-value="paused"');
    expect(html).toContain('<button class="status-trigger" type="button" aria-haspopup="menu" aria-expanded="false" data-status-trigger="true" aria-label="Status: Draft" title="Change status (S)">');
    expect(html).toContain('placeholder="Change status..."');
  });

  test('the calibrated live judge offers draft and paused but not a self-move', async () => {
    const [, html] = await page('/judges?state=live');
    expect(html).toContain('data-kind="judge" data-id="beta" data-current="live"');
    expect(html).not.toContain('data-id="alpha"');
    expect(html).not.toContain('aria-disabled="true"');
  });

  test('each row has a select box and the list ends with a bulk bar with an any-move Status menu', async () => {
    const [, html] = await page('/judges');
    expect(html).toContain('<input type="checkbox" class="row-check" aria-label="Select alpha" data-row-check="true"/>');
    expect(html).toContain('<div class="bulk-bar" data-bulk-bar="true" hidden="">');
    expect(html).toContain('data-kind="judge" data-id="bulk" data-variant="bulk" data-up="1"');
    expect(html).toContain('/client/judges.js');
  });

  test('an empty state tab names the state, and an unknown state is 400', async () => {
    expect((await page('/judges?state=paused'))[1]).toContain('No paused judges');
    expect((await page('/judges?state=bogus'))[0]).toBe(400);
  });
});

describe('judge page', () => {
  test('renders the four tabs with counts and keeps the old URLs', async () => {
    const [status, html] = await page('/judges/alpha');
    expect(status).toBe(200);
    for (const tab of [
      `<a class="tab" href="${base}/judges/alpha" aria-current="page">Overview</a>`,
      `<a class="tab" href="${base}/judges/alpha?tab=versions">Versions<span class="count">1</span></a>`,
      `<a class="tab" href="${base}/judges/alpha?tab=disagreements">Disagreements<span class="count">0</span></a>`,
      `<a class="tab" href="${base}/judges/alpha?tab=issues">Issues<span class="count">1</span></a>`,
    ]) expect(html).toContain(tab);
    expect((await page('/judges/alpha/versions/1'))[0]).toBe(200);
    expect((await app.request('/judges/alpha/disagreements')).headers.get('location')).toBe(`${base}/review?judge=alpha&version=1`);
    expect((await page('/judges/alpha?tab=nope'))[0]).toBe(400);
  });

  test('the right panel lists status, editable properties, read-only facts, and relation links', async () => {
    const [, html] = await page('/judges/alpha');
    expect(html).toContain('<aside class="aside" aria-label="Judge" data-judge="alpha">');
    expect(html).toContain('data-kind="judge" data-id="alpha" data-current="draft" data-variant="field" data-reload="1"');
    expect(html).toContain('<dt>Active version</dt><dd><select class="input" name="version" aria-label="Active version" data-activate="true"><option value="1" selected="">v1</option></select></dd>');
    expect(html).toContain('<dt>Description</dt><dd><input class="input" name="description" aria-label="Description" placeholder="Add a description" value="" data-description="true"/></dd>');
    expect(html).toContain('<dt>Labels collected</dt><dd><span class="propbtn num"><svg class="ic" aria-hidden="true"><use href="#i-score"/></svg>0/100</span></dd>');
    for (const fact of ['Calibration status', 'TPR', 'TNR', 'Scope', 'Model', 'Created']) expect(html).toContain(`<dt>${fact}</dt>`);
    expect(html).toContain(`<a class="link" href="${base}/judges/alpha?tab=versions">1 version</a>`);
    expect(html).toContain(`<a class="link" href="${base}/judges/alpha?tab=disagreements">0</a>`);
    expect(html).toContain(`<a class="link" href="${base}/judges/alpha?tab=issues">1</a>`);
    expect(html.indexOf('<h2>Status</h2>')).toBeLessThan(html.indexOf('<h2>Properties</h2>'));
    expect(html.indexOf('<h2>Properties</h2>')).toBeLessThan(html.indexOf('<h2>Facts</h2>'));
    expect(html.indexOf('<h2>Facts</h2>')).toBeLessThan(html.indexOf('<h2>Relations</h2>'));
    expect(html).toContain('/client/judge.js');
  });

  test('the calibrated judge shows its rates in Facts', async () => {
    const [, html] = await page('/judges/beta');
    expect(html).toContain('<dt>TPR</dt><dd><span class="propbtn num"><svg class="ic" aria-hidden="true"><use href="#i-pass"/></svg>92%</span></dd>');
    expect(html).toContain('<dt>TNR</dt><dd><span class="propbtn num"><svg class="ic" aria-hidden="true"><use href="#i-pass"/></svg>95%</span></dd>');
  });

  test('the Issues tab lists issues linked to the judge, and Versions lists the timeline', async () => {
    const [, issues] = await page('/judges/alpha?tab=issues');
    expect(issues).toContain('<span class="grow strong">Reply slips into Dutch</span>');
    expect((await page('/judges/beta?tab=issues'))[1]).toContain('No linked issues');
    expect((await page('/judges/alpha?tab=versions'))[1]).toContain('class="version"');
    expect((await page('/judges/alpha?tab=disagreements'))[1]).toContain('No disagreements');
  });

  test('PATCH description saves, trims, and shows on the page', async () => {
    const res = await send(app, 'PATCH', '/api/judges/alpha', { description: '  Flags Dutch replies  ' });
    expect((await json<{ description: string }>(res)).description).toBe('Flags Dutch replies');
    expect((await page('/judges/alpha'))[1]).toContain('value="Flags Dutch replies"');
    expect((await send(app, 'PATCH', '/api/judges/alpha', {})).status).toBe(400);
  });
});

describe('issues list bulk bar', () => {
  test('rows carry a select box and the bar offers every move plus the reason form', async () => {
    const [, html] = await page('/');
    expect(html).toContain('aria-label="Select Reply slips into Dutch" data-row-check="true"/>');
    expect(html).toContain('<div class="bulk-bar" data-bulk-bar="true" hidden="">');
    expect(html).toContain('<form class="bulk-reason" data-bulk-reason="true" hidden="">');
    expect(html).toContain('/client/issues.js');
  });
});
