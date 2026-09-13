import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import { font } from '../../../design-system/src/tokens.ts';
import { urls } from '../urls.ts';
import { Icon, sprite } from './ui.tsx';

type Props = { title: string; inbox: number; script?: string; children: Child };

export const Layout = ({ title, inbox, script, children }: Props) => (
  <>
    {raw('<!doctype html>')}
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="icon" href="/favicon.svg" />
        <link rel="stylesheet" href={font.googleFontsUrl} />
        <link rel="stylesheet" href="/spotter.css" />
        <link rel="stylesheet" href="/pages.css" />
        {script ? <script type="module" src={`/client/${script}.js`}></script> : null}
      </head>
      <body>
        {sprite}
        <header class="topbar">
          <div class="container">
            <a class="brand" href={urls.inbox()}>
              <Icon name="paw" size="lg" label="Spotter" />
              Spotter
            </a>
            <a class="btn btn-secondary btn-compact" href={urls.inbox()}>
              <Icon name="flag" size="sm" />
              Inbox
              {inbox > 0 ? <span class="badge">{inbox}</span> : null}
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
