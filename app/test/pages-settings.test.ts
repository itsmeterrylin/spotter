import { describe, expect, test } from 'bun:test';
import { page, pageApp, seedPages } from './helpers.ts';

describe('settings', () => {
  test('renders agents, data sources, attribute map, and about', async () => {
    const { app } = pageApp();
    await seedPages(app);
    const [status, html] = await page(app, '/settings');
    expect(status).toBe(200);
    for (const s of ['claude mcp add --transport http spotter', '/mcp', 'OTEL_EXPORTER_OTLP_ENDPOINT', '/api/otel/v1/traces', 'Attribute map', 'attribute_map.set', 'Base URL', 'SPOTTER_JUDGE_BASE_URL', 'openrouter.ai', 'data-theme-choice="dark"']) expect(html).toContain(s);
  });

  test('sidebar links to settings and applies the saved theme, with the toggle only on settings', async () => {
    const { app } = pageApp();
    const [, html] = await page(app, '/');
    expect(html).toContain('nav-settings');
    expect(html).toContain("localStorage.getItem('spotter.theme')");
    expect(html).not.toContain('data-theme-choice');
    const [, settings] = await page(app, '/settings');
    expect((settings.match(/data-theme-choice="light"/g) ?? []).length).toBe(1);
  });
});
