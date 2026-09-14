import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import type { IconName } from '../../../design-system/src/icons.ts';
import { font } from '../../../design-system/src/tokens.ts';
import pkg from '../../package.json' with { type: 'json' };
import { urls } from '../urls.ts';
import { type Crumb, Crumbs, Icon, sprite } from './ui.tsx';

export type Section = 'runs' | 'datasets' | 'traces' | 'judges' | 'notifications' | 'settings';

type Props = { title: string; section: Section | null; unread: number; crumbs?: Crumb[]; action?: Child; script?: string; children: Child };

// Runs before the stylesheet so a saved theme never flashes the other one.
const themeBoot = `<script>try{var t=localStorage.getItem('spotter.theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>`;
const themeToggle = `<script>(function(){var r=document.documentElement,b=document.querySelectorAll('[data-theme-choice]');function cur(){try{return localStorage.getItem('spotter.theme')||'system'}catch(e){return 'system'}}function paint(c){b.forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.themeChoice===c))})}function set(c){if(c==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',c);try{if(c==='system')localStorage.removeItem('spotter.theme');else localStorage.setItem('spotter.theme',c)}catch(e){}paint(c)}b.forEach(function(x){x.addEventListener('click',function(){set(x.dataset.themeChoice)})});paint(cur())})()</script>`;

const sections: Array<[Section, string, IconName, string]> = [
  ['runs', 'Runs', 'run', urls.runs()],
  ['datasets', 'Datasets', 'dataset', urls.datasets()],
  ['traces', 'Traces', 'trace', urls.traces()],
  ['judges', 'Judges', 'judge', urls.judges()],
];

const Sidebar = ({ section }: { section: Section | null }) => (
  <aside class="sidebar">
    <a class="brand" href={urls.home()}>
      <Icon name="paw" size="lg" label="Spotter" />
      Spotter
    </a>
    <input class="nav-toggle" type="checkbox" id="nav-toggle" />
    <label class="btn btn-ghost btn-icon menu" for="nav-toggle"><Icon name="menu" label="Menu" /></label>
    <nav class="nav" aria-label="Sections">
      {sections.map(([key, label, icon, href]) => (
        <a class={`nav-item${key === section ? ' pill-brand' : ''}`} href={href} aria-current={key === section ? 'page' : undefined}>
          <Icon name={icon} />
          {label}
        </a>
      ))}
      <a class={`nav-item nav-settings${section === 'settings' ? ' pill-brand' : ''}`} href={urls.settings()} aria-current={section === 'settings' ? 'page' : undefined}>
        <Icon name="settings" />
        Settings
      </a>
      <div class="foot">
        <span class="build t-caption">v{pkg.version}</span>
        <div class="cluster theme" style="--gap: 4px" role="group" aria-label="Theme">
          <button type="button" class="btn btn-ghost btn-compact" data-theme-choice="system" aria-pressed="true">Auto</button>
          <button type="button" class="btn btn-ghost btn-compact" data-theme-choice="light" aria-pressed="false">Light</button>
          <button type="button" class="btn btn-ghost btn-compact" data-theme-choice="dark" aria-pressed="false">Dark</button>
        </div>
      </div>
    </nav>
  </aside>
);

export const Layout = ({ title, section, unread, crumbs = [], action, script, children }: Props) => (
  <>
    {raw('<!doctype html>')}
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · Spotter`}</title>
        <link rel="icon" href="/favicon.svg" />
        {raw(themeBoot)}
        <link rel="stylesheet" href={font.googleFontsUrl} />
        <link rel="stylesheet" href="/spotter.css" />
        <link rel="stylesheet" href="/pages.css" />
        {script ? <script type="module" src={`/client/${script}.js`}></script> : null}
      </head>
      <body>
        {sprite}
        <div class="shell">
          <Sidebar section={section} />
          <div class="content">
            <header class="topbar">
              <div class="container">
                <div class="head">
                  {crumbs.length ? <Crumbs items={crumbs} /> : null}
                  <h1 class="t-title heavy">{title}</h1>
                </div>
                <div class="actions">
                  {action}
                  <a class={`btn btn-ghost btn-icon bell${section === 'notifications' ? ' pill-brand' : ''}`} href={urls.notifications()} aria-label="Notifications">
                    <Icon name="bell" />
                    {unread > 0 ? <span class="badge">{unread}</span> : null}
                  </a>
                </div>
              </div>
            </header>
            <main>
              <div class="container">{children}</div>
            </main>
          </div>
        </div>
        {raw(themeToggle)}
      </body>
    </html>
  </>
);
