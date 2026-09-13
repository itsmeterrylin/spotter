import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { join } from 'node:path';
import pkg from '../package.json' with { type: 'json' };
import { pages } from './pages/index.tsx';

const publicDir = join(import.meta.dir, '..', 'public');

export const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, version: pkg.version }));
app.use('/*', serveStatic({ root: publicDir }));
app.route('/', pages);
