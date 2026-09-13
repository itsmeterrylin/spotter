import { describe, expect, test } from 'bun:test';
import { app } from '../src/app.ts';

describe('health', () => {
  test('GET /health returns ok and version', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; version: string };
    expect(body.ok).toBe(true);
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('GET / renders the inbox page', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Inbox');
    expect(html).toContain('/spotter.css');
  });
});
