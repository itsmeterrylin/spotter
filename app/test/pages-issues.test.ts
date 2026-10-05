import { beforeAll, describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import { json, page, pageApp, send } from './helpers.ts';

const { app } = pageApp();
const base = 'http://localhost:3000';
const ids = { trace: uuid7(), other: uuid7(), open: '', dismissed: '', unlinked: '' };

const messages = [
  { turn: 0, role: 'user', content: 'What time is checkout?' },
  { turn: 1, role: 'assistant', content: 'Checkout is at 11:00.' },
  { turn: 2, role: 'user', content: 'Can I stay until 1pm?' },
  { turn: 3, role: 'assistant', content: 'Natuurlijk, tot 13:00.' },
];

describe('issue pages', () => {
  beforeAll(async () => {
    const ds = await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'concierge', name: 'prod' }));
    const run = await json<{ id: string }>(await send(app, 'POST', '/api/runs', { dataset_id: ds.id, name: 'prod-oct' }));
    const trace = (id: string) => ({ id, project: 'concierge', run_id: run.id, messages, start: '2026-10-01T10:00:00.000Z' });
    await send(app, 'POST', '/api/traces/batch', { traces: [trace(ids.trace), trace(ids.other)] });
    const v = await json<{ id: string }>(await send(app, 'POST', '/api/judges/language-leak/versions', { prompt: 'Same language?', model: 'fake:contains', scope: 'turn', created_by: 'human' }));
    await send(app, 'PUT', `/api/traces/${ids.trace}/scores`, { scores: [{ name: 'language-leak', value: 0, turn: 3, source: 'judge', judge_version_id: v.id }] });
    await send(app, 'PUT', `/api/traces/${ids.other}/scores`, { scores: [{ name: 'language-leak', value: 1, turn: 3, source: 'judge', judge_version_id: v.id }] });
    const upsert = async (title: string, extra: Record<string, unknown> = {}) =>
      (await json<{ id: string }>(await send(app, 'POST', '/api/issues', { project: 'concierge', title, seed_trace_id: ids.trace, traces: [{ trace_id: ids.trace, turn: 3 }], created_by: 'human', ...extra }))).id;
    ids.open = await upsert('Reply slips into Dutch', { severity: 'high', judge_name: 'language-leak' });
    ids.dismissed = await upsert('Greets guest in Dutch', { created_by: 'agent' });
    ids.unlinked = await upsert('Late checkout without a fee');
    await send(app, 'PATCH', `/api/issues/${ids.dismissed}`, { status: 'dismissed', dismissed_reason: 'Guest wrote Dutch' });
  });

  test('GET / is the Open tab with counts and one row per open issue', async () => {
    const [status, html] = await page(app, '/');
    expect(status).toBe(200);
    expect(html).toContain(`<a class="tab" href="${base}/" aria-current="page">Open<span class="count">2</span></a>`);
    expect(html).toContain(`<a class="tab" href="${base}/issues?status=confirmed">Confirmed<span class="count">0</span></a>`);
    expect(html).toContain(`<a class="tab" href="${base}/issues?status=dismissed">Dismissed<span class="count">1</span></a>`);
    expect(html).not.toContain('<h1 class="t-title">');
    expect(html).toContain('<h1 class="crumb-current">Issues</h1>');
    expect(html.match(/<div class="list-row" data-row="true"/g)?.length).toBe(2);
    expect(html).toContain(`<div class="list-row" data-row="true" data-id="${ids.open}">`);
    expect(html).toContain(`<span class="status-menu" data-status-menu="true" data-kind="issue" data-id="${ids.open}" data-current="open" data-variant="icon">`);
    expect(html).toContain('<button class="status-trigger" type="button" aria-haspopup="menu" aria-expanded="false" data-status-trigger="true" aria-label="Status: Open" title="Change status (S)"><span class="state" role="img" aria-label="Open"></span></button>');
    expect(html).toContain(`<a class="grow strong row-link" href="${base}/issues/${ids.open}">Reply slips into Dutch</a>`);
    expect(html).toContain('placeholder="Change status..."');
    expect(html).toContain('<kbd class="kbd">S</kbd>');
    expect(html).toContain('data-value="dismissed" data-label="Dismissed" data-needs-reason="1"');
    expect(html).toContain('<span class="pill pill-fail">high</span><span class="meta judge-name">language-leak</span>');
    expect(html).toContain('<form class="row-dismiss" id="row-dismiss" hidden="">');
    expect(html).toContain('/client/issues.js');
    expect(html).not.toContain('Greets guest in Dutch');
  });

  test('the Dismissed tab lists the dismissed issue with a slashed state', async () => {
    const [, html] = await page(app, '/issues?status=dismissed');
    expect(html).toContain(`<a class="tab" href="${base}/issues?status=dismissed" aria-current="page">Dismissed<span class="count">1</span></a>`);
    expect(html).toContain('<button class="status-trigger" type="button" aria-haspopup="menu" aria-expanded="false" data-status-trigger="true" aria-label="Status: Dismissed" title="Change status (S)"><span class="state state-dismissed" role="img" aria-label="Dismissed"></span></button>');
    expect(html).toContain('>Greets guest in Dutch</a>');
    expect(html).toContain('data-status="dismissed"');
    expect(html).not.toContain('Reply slips into Dutch');
  });

  test('issue detail renders the six regions, three tabs, stats, seed transcript, and the backtest action', async () => {
    const [status, html] = await page(app, `/issues/${ids.open}`);
    expect(status).toBe(200);
    for (const cls of ['<nav class="rail"', '<aside class="sidebar">', '<nav class="tabs"', `<aside class="aside" aria-label="Issue" data-issue="${ids.open}">`, '<footer class="statusbar">']) expect(html).toContain(cls);
    expect(html).toContain(`<a class="tab" href="${base}/issues/${ids.open}" aria-current="page">Overview</a>`);
    expect(html).toContain(`<a class="tab" href="${base}/issues/${ids.open}?tab=traces">Traces<span class="count">1</span></a>`);
    expect(html).toContain(`<a class="tab" href="${base}/issues/${ids.open}?tab=backtest">Backtest<span class="count">1</span></a>`);
    expect(html).toContain('<span class="label"><svg class="ic ic-sm" aria-hidden="true"><use href="#i-issue"/></svg>Traces affected</span><span class="t-stat num">50%</span>');
    expect(html).toContain('<div class="turn" id="turn-3" data-focus="1">');
    expect(html).toContain('Natuurlijk, tot 13:00.');
    expect(html).toContain(`href="${base}/issues/${ids.open}?tab=backtest"><svg class="ic" aria-hidden="true"><use href="#i-backtest"/></svg>Backtest with language-leak</a>`);
    expect(html).toContain('<button class="propbtn" type="button" aria-haspopup="menu" aria-expanded="false" data-status-trigger="true" aria-label="Status: Open" title="Status">');
    expect(html).toContain('role="menuitemradio" aria-checked="true" data-value="open" data-label="Open">');
    expect(html).toContain('<form class="dismiss-form stack" data-dismiss-form="true" hidden="" style="--gap: var(--space-8)">');
    expect(html).not.toContain('data-new-issue-open data-turn');
  });

  test('a dismissed issue disables the illegal move to confirmed', async () => {
    const [, html] = await page(app, `/issues/${ids.dismissed}`);
    expect(html).toContain('role="menuitemradio" aria-checked="false" aria-disabled="true" title="Cannot move from Dismissed to Confirmed" data-value="confirmed" data-label="Confirmed">');
    expect(html).toContain('role="menuitemradio" aria-checked="false" data-value="open" data-label="Open">');
    expect(html).toContain('<p class="dismissed-note"><span class="pill"><svg class="ic ic-sm" aria-hidden="true"><use href="#i-dismiss"/></svg>Dismissed</span> Guest wrote Dutch</p>');
  });

  test('the Traces tab lists occurrences with their turn', async () => {
    const [, html] = await page(app, `/issues/${ids.open}?tab=traces`);
    expect(html).toContain(`<a class="list-row" href="${base}/traces/${ids.trace}?turn=3">`);
    expect(html).toContain('<span class="meta">turn 3</span>');
  });

  test('the Backtest tab shows counts, failing traces, and the CLI command with a copy button', async () => {
    const [, html] = await page(app, `/issues/${ids.open}?tab=backtest`);
    expect(html).toContain('Traces scored</span><span class="t-stat num">2</span>');
    expect(html).toContain('Fails</span><span class="t-stat num">1</span>');
    expect(html).toContain('Fail rate</span><span class="t-stat num">50%</span>');
    expect(html).toMatch(/<pre class="code">spotter judge run language-leak --run [0-9a-f-]{36}<\/pre>/);
    expect(html).toContain('data-copy="spotter judge run language-leak --run ');
    expect(html).toContain(`<a class="list-row" href="${base}/traces/${ids.trace}?turn=3">`);
  });

  test('without a judge, Backtest offers the judge select and a link to /judges', async () => {
    const [, html] = await page(app, `/issues/${ids.unlinked}?tab=backtest`);
    expect(html).toContain('No judge linked');
    expect(html).toContain('<form class="link-judge cluster" data-link-judge="true"');
    expect(html).toContain('<option value="language-leak">language-leak</option>');
    expect(html).toContain(`<a class="btn btn-ghost" href="${base}/judges">`);
    const [, overview] = await page(app, `/issues/${ids.unlinked}`);
    expect(overview).toContain('Link a judge</a>');
  });

  test('the trace page flags each turn, offers New issue, and lists the issues it belongs to', async () => {
    const [, html] = await page(app, `/traces/${ids.trace}?turn=3`);
    expect(html).toContain('<button class="turn-flag" type="button" data-new-issue-open="true" data-turn="3" aria-label="New issue at turn 3" title="New issue at turn 3">');
    expect(html).toContain('<option value="3" selected="">Turn 3</option>');
    expect(html).toContain(`<a class="list-row" href="${base}/issues/${ids.open}"><span class="state" role="img" aria-label="Open"></span><span class="grow">Reply slips into Dutch</span></a>`);
  });

  test('unknown issues 404 and a bad tab is 400', async () => {
    expect((await page(app, '/issues/nope'))[0]).toBe(404);
    expect((await page(app, `/issues/${ids.open}?tab=nope`))[0]).toBe(400);
  });
});
