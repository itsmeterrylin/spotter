import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import { icon } from '../../../design-system/src/icons.ts';
import { font } from '../../../design-system/src/tokens.ts';
import { urls } from '../urls.ts';

const chrome = `
.topbar { position: sticky; top: 0; z-index: 10; background: color-mix(in srgb, var(--canvas) 90%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
.topbar .container { display: flex; align-items: center; justify-content: space-between; gap: var(--space-16); min-height: 72px; }
.brand { display: inline-flex; align-items: center; gap: var(--space-8); font-weight: 800; text-decoration: none; }
.brand .ic { color: var(--brand); }
main { padding-block: var(--space-32) var(--space-64); }
.page-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-16); margin-bottom: var(--space-32); }
`;

type Props = { title: string; children: Child };

export const Layout = ({ title, children }: Props) => (
  <>
    {raw('<!doctype html>')}
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <link rel="stylesheet" href={font.googleFontsUrl} />
      <link rel="stylesheet" href="/spotter.css" />
      <style>{raw(chrome)}</style>
    </head>
    <body>
      <header class="topbar">
        <div class="container">
          <a class="brand" href={urls.inbox()}>
            {raw(icon('paw', 'lg', 'Spotter'))}Spotter
          </a>
          <a class="btn btn-secondary btn-compact" href={urls.inbox()}>
            {raw(icon('flag', 'sm'))}Inbox
          </a>
        </div>
      </header>
      <main>
        <div class="container">{children}</div>
      </main>
    </body>
    </html>
  </>
);
