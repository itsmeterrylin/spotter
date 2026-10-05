import { beforeAll, describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import { json, page, pageApp, send } from './helpers.ts';

const { app } = pageApp();
const base = 'http://localhost:3000';
const ids = { trace: uuid7(), item: uuid7(), dataset: '', run: '', issue: '' };

const messages = [
  { turn: 0, role: 'user', content: 'What time is checkout?' },
  { turn: 1, role: 'assistant', content: 'Natuurlijk, tot 13:00.' },
];

beforeAll(async () => {
  ids.dataset = (await json<{ id: string }>(await send(app, 'POST', '/api/datasets', { project: 'concierge', name: 'prod', description: 'Real guests' }))).id;
  await send(app, 'PUT', `/api/datasets/${ids.dataset}/items`, { items: [{ id: ids.item, input: { transcript: 'late checkout' }, expected: { reply: 'yes' }, source_trace_id: ids.trace }] });
  ids.run = (await json<{ id: string }>(await send(app, 'POST', '/api/runs', { dataset_id: ids.dataset, name: 'prod-oct' }))).id;
  await send(app, 'POST', '/api/traces/batch', { traces: [{ id: ids.trace, project: 'concierge', run_id: ids.run, messages, start: '2026-10-01T10:00:00.000Z' }] });
  const v = await json<{ id: string }>(await send(app, 'POST', '/api/judges/language-leak/versions', { prompt: 'Does the reply stay in the guest language?', model: 'fake:contains', scope: 'turn', created_by: 'human' }));
  await send(app, 'PUT', `/api/traces/${ids.trace}/scores`, { scores: [{ name: 'language-leak', value: 0, turn: 1, source: 'judge', judge_version_id: v.id }] });
  ids.issue = (await json<{ id: string }>(await send(app, 'POST', '/api/issues', { project: 'concierge', title: 'Reply slips into Dutch', description: 'Replies switch language mid-chat', severity: 'high', judge_name: 'language-leak', seed_trace_id: ids.trace, traces: [{ trace_id: ids.trace, turn: 1, evidence: 'Natuurlijk' }], created_by: 'human' }))).id;
});

const pane = async (path: string): Promise<string> => {
  const [status, html] = await page(app, path);
  expect(status).toBe(200);
  expect(html).not.toContain('<html');
  return html;
};

describe('peek fragments', () => {
  test('every kind answers at <object path>/pane with a header, its right panel, and a preview', async () => {
    const cases: Array<[string, string, string[]]> = [
      [`/issues/${ids.issue}/pane`, 'issue', ['<span class="pane-title" title="Reply slips into Dutch">', 'Replies switch language mid-chat', 'First occurrence', 'Natuurlijk']],
      [`/traces/${ids.trace}/pane`, 'trace', ['Conversation', 'What time is checkout?', 'data-new-issue-open']],
      [`/judges/language-leak/pane`, 'judge', ['Criterion', 'Does the reply stay in the guest language?', 'Needs labels']],
      [`/judges/language-leak/versions/1/pane`, 'version', ['<span class="pane-title" title="language-leak v1">', 'Does the reply stay in the guest language?']],
      [`/runs/${ids.run}/pane`, 'run', ['<span class="pane-title" title="prod-oct">', 'Scores']],
      [`/datasets/${ids.dataset}/pane`, 'dataset', ['<span class="pane-title" title="prod">', 'Latest runs', 'prod-oct']],
      [`/datasets/${ids.dataset}/items/${ids.item}/pane`, 'item', ['Input', 'late checkout', 'Expected']],
    ];
    for (const [path, kind, expected] of cases) {
      const html = await pane(path);
      expect(html).toContain(`<div class="pane-inner" data-peek-kind="${kind}">`);
      expect(html).toContain('title="Close" aria-label="Close"');
      expect(html).toContain('data-pane-close');
      expect(html).toContain('<h2>Properties</h2>');
      expect(html.indexOf('<h2>Properties</h2>')).toBeLessThan(html.indexOf('<h2>Relations</h2>'));
      for (const text of expected) expect(html).toContain(text);
    }
  });

  test('Open links to the full page and the close link defaults to the kind list', async () => {
    const html = await pane(`/runs/${ids.run}/pane`);
    expect(html).toContain(`<a class="btn btn-secondary" href="${base}/runs/${ids.run}" title="Open the full page">`);
    expect(html).toContain(`<a class="btn btn-ghost btn-icon" href="${base}/runs" data-pane-close="true"`);
    const custom = await pane(`/runs/${ids.run}/pane?close=${encodeURIComponent('/runs?dataset=x')}`);
    expect(custom).toContain('href="/runs?dataset=x" data-pane-close="true"');
  });

  test('status comes first on issues and judges, and Properties and Relations group the rest', async () => {
    const issue = await pane(`/issues/${ids.issue}/pane`);
    expect(issue.indexOf('<h2>Status</h2>')).toBeLessThan(issue.indexOf('<h2>Properties</h2>'));
    expect(issue).toContain('data-kind="severity" data-id="' + ids.issue + '" data-current="high" data-variant="field" data-reload="1"');
    const run = await pane(`/runs/${ids.run}/pane`);
    expect(run).not.toContain('<h2>Status</h2>');
  });

  test('unknown ids 404', async () => {
    for (const path of ['/issues/nope/pane', '/traces/nope/pane', '/judges/nope/pane', '/judges/language-leak/versions/9/pane', '/runs/nope/pane', '/datasets/nope/pane', `/datasets/${ids.dataset}/items/nope/pane`]) {
      expect((await page(app, path))[0]).toBe(404);
    }
  });
});

describe('peek on lists', () => {
  test('rows carry their peek path and id, and the region is hidden until a row opens it', async () => {
    const lists: Array<[string, string, string]> = [
      ['/', `/issues/${ids.issue}/pane`, ids.issue],
      ['/judges', '/judges/language-leak/pane', 'language-leak'],
      ['/traces', `/traces/${ids.trace}/pane`, ids.trace],
      ['/runs', `/runs/${ids.run}/pane`, ids.run],
      [`/runs/${ids.run}`, `/traces/${ids.trace}/pane`, ids.trace],
      ['/datasets', `/datasets/${ids.dataset}/pane`, ids.dataset],
      [`/datasets/${ids.dataset}`, `/datasets/${ids.dataset}/items/${ids.item}/pane`, ids.item],
      ['/judges/language-leak?tab=versions', '/judges/language-leak/versions/1/pane', '1'],
      ['/judges/language-leak?tab=issues', `/issues/${ids.issue}/pane`, ids.issue],
      [`/issues/${ids.issue}?tab=traces`, `/traces/${ids.trace}/pane`, ids.trace],
    ];
    for (const [path, peek, id] of lists) {
      const [status, html] = await page(app, path);
      expect(status).toBe(200);
      expect(html).toContain(`data-peek="${peek}" data-peek-id="${id}"`);
      expect(html).toContain('<aside class="aside pane" id="pane" aria-label="Peek" hidden="">');
      expect(html).not.toContain('class="pane-inner"');
    }
  });

  test('?peek= renders the pane open and marks the row', async () => {
    const [, html] = await page(app, `/runs?peek=${ids.run}`);
    expect(html).toContain('<aside class="aside pane" id="pane" aria-label="Peek">');
    expect(html).toContain(`data-peek="/runs/${ids.run}/pane" data-peek-id="${ids.run}" data-peeked="1"`);
    expect(html).toContain('<div class="pane-inner" data-peek-kind="run">');
    expect(html).toContain('href="/runs" data-pane-close="true"');
  });

  test('?trace= is an alias on trace lists', async () => {
    const [, html] = await page(app, `/traces?trace=${ids.trace}`);
    expect(html).toContain(`data-peek-id="${ids.trace}" data-peeked="1"`);
    expect(html).toContain('<div class="pane-inner" data-peek-kind="trace">');
    expect(html).toContain('data-pane-close');
  });

  test('a detail page keeps its own panel and adds the peek region beside it', async () => {
    const [, html] = await page(app, `/judges/language-leak?tab=versions&peek=1`);
    expect(html).toContain('<aside class="aside" aria-label="Judge">');
    expect(html).toContain('<div class="pane-inner" data-peek-kind="version">');
    expect(html).toContain('href="/judges/language-leak?tab=versions" data-pane-close="true"');
  });

  test('the peek client is bundled with every list script', async () => {
    for (const name of ['issues', 'judges', 'traces', 'rows', 'issue', 'judge']) {
      const [status, js] = await page(app, `/client/${name}.js`);
      expect(status).toBe(200);
      expect(js).toContain('data-pane-close');
    }
  });
});

describe('detail panels', () => {
  test('a judge version page has the panel with status, facts, and relations, and no chips or definition block', async () => {
    const [status, html] = await page(app, '/judges/language-leak/versions/1');
    expect(status).toBe(200);
    expect(html).toContain('<aside class="aside" aria-label="Judge version">');
    expect(html).toContain('<dt class="sr">Status</dt><dd><span class="propbtn verdict-pass" title="Status"><svg class="ic" aria-hidden="true"><use href="#i-stateLive"/></svg>Active</span></dd>');
    for (const name of ['Version', 'Calibration', 'Scope', 'Model', 'Created by', 'Created', 'Content hash', 'Judge', 'Parent version', 'Calibration report', 'Disagreements']) expect(html).toContain(`<dt class="sr">${name}</dt>`);
    expect(html).toContain('turn scope');
    expect(html).toContain('No parent version');
    expect(html).toContain('No calibration yet');
    expect(html).toContain(`<a class="link" href="${base}/judges/language-leak">language-leak</a>`);
    expect(html.indexOf('<h2>Status</h2>')).toBeLessThan(html.indexOf('<h2>Properties</h2>'));
    expect(html).not.toContain('<dl class="kv">');
    expect(html).not.toContain('<div class="page-head">');
  });

  test('a dataset page has the panel with its counts and relations', async () => {
    const [, html] = await page(app, `/datasets/${ids.dataset}`);
    expect(html).toContain('<aside class="aside" aria-label="Dataset">');
    expect(html).toContain('Real guests');
    expect(html).toContain('<dt class="sr">Items</dt><dd><span class="propbtn num" title="Items"><svg class="ic" aria-hidden="true"><use href="#i-trace"/></svg>1 item</span></dd>');
    expect(html).toContain(`<a class="link" href="${base}/runs?dataset=${ids.dataset}">1 run</a>`);
    expect(html).toContain('1 source trace');
  });
});
