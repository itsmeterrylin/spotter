import type { Database } from 'bun:sqlite';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { join } from 'node:path';
import pkg from '../package.json' with { type: 'json' };
import { createApi } from './api/index.ts';
import { createRepos } from './db/repos/index.ts';
import { createPages } from './pages/index.tsx';
import { mountMcp } from './mcp/index.ts';

const publicDir = join(import.meta.dir, '..', 'public');

export function createApp(db: Database): Hono {
  const app = new Hono();
  app.get('/health', (c) => c.json({ ok: true, version: pkg.version }));
  app.route('/api', createApi(createRepos(db)));
  mountMcp(app, db);
  app.use('/*', serveStatic({ root: publicDir }));
  app.route('/', createPages(createRepos(db)));
  return app;
}
