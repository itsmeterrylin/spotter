import { describe, expect, test } from 'bun:test';
import { page, pageApp, seedPages } from './helpers.ts';

describe('trace pane', () => {
  test('?trace= renders the pane and marks the row', async () => {
    const { app } = pageApp();
    const seed = await seedPages(app);
    const id = seed.b[0];
    const [status, html] = await page(app, `/traces?run=${seed.runB}&trace=${id}`);
    expect(status).toBe(200);
    expect(html).toContain('<aside class="aside aside-wide pane" id="pane" aria-label="Trace">');
    expect(html).toContain(`data-trace="${id}" data-selected="1"`);
    expect(html).toContain(`<div class="pane-inner" data-trace="${id}">`);
    expect(html).toContain('data-pane-close');
    expect(html).toContain('<button class="btn btn-primary" type="button" data-new-issue-open="true">');
    expect(html).toContain('/client/traces.js');
  });

  test('without ?trace= the pane is hidden', async () => {
    const { app } = pageApp();
    const seed = await seedPages(app);
    const [, html] = await page(app, `/traces?run=${seed.runB}`);
    expect(html).toContain('id="pane" aria-label="Trace" hidden');
    expect(html).not.toContain('class="pane-inner"');
  });

  test('the pane fragment has no document skeleton and unknown ids 404', async () => {
    const { app } = pageApp();
    const seed = await seedPages(app);
    const [status, html] = await page(app, `/traces/${seed.b[1]}/pane`);
    expect(status).toBe(200);
    expect(html).not.toContain('<html');
    expect(html).toContain('pane-inner');
    const [missing] = await page(app, '/traces/nope/pane');
    expect(missing).toBe(404);
  });

  test('the pane client module is served', async () => {
    const { app } = pageApp();
    const [status, js] = await page(app, '/client/traces.js');
    expect(status).toBe(200);
    expect(js).toContain('data-pane-close');
  });

  test('the pane lists properties as single rows with hidden names, action phrases for empties, and no empty sections', async () => {
    const { app } = pageApp();
    const seed = await seedPages(app);
    const [, html] = await page(app, `/traces/${seed.b[1]}/pane`);
    expect(html).toContain('<h2>Properties</h2>');
    expect(html).toContain('<dt class="sr">Verdict</dt>');
    expect(html).toContain('title="Verdict"');
    expect(html).toContain('Set verdict');
    expect(html).not.toContain('grid-template-columns');
    expect(html).not.toContain('<span class="block-label">Expected</span>');
    expect(html).toContain('title="Close" aria-label="Close"');
  });
});
