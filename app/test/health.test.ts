import { describe, expect, test } from 'bun:test';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db/client.ts';

const app = createApp(openDatabase(':memory:'));

describe('health', () => {
  test('GET /health returns ok and version', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; version: string };
    expect(body.ok).toBe(true);
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('GET / renders the runs page', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Runs');
    expect(html).toContain('/spotter.css');
  });
});
