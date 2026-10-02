import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import type { IconName } from '../../../design-system/src/icons.ts';
import { font } from '../../../design-system/src/tokens.ts';
import { urls } from '../urls.ts';
import { initials, type Shell } from './data.ts';
import { type Crumb, Crumbs, Icon, sprite } from './ui.tsx';

export type Section = 'issues' | 'runs' | 'datasets' | 'traces' | 'judges' | 'notifications' | 'settings';

export type Tab = { href: string; label: string; count?: number; current: boolean };

type Props = {
  title: string;
  meta?: Child;
  section: Section | null;
  shell: Shell;
  tabs?: Tab[];
  crumbs?: Crumb[];
  action?: Child;
  script?: string;
  aside?: Child;
  children: Child;
};

// Runs before the stylesheet so a saved theme never flashes the other one.
const themeBoot = `<script>try{var t=localStorage.getItem('spotter.theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>`;
const themeToggle = `<script>(function(){var r=document.documentElement,b=document.querySelectorAll('[data-theme-choice]');function cur(){try{return localStorage.getItem('spotter.theme')||'system'}catch(e){return 'system'}}function paint(c){b.forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.themeChoice===c))})}function set(c){if(c==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',c);try{if(c==='system')localStorage.removeItem('spotter.theme');else localStorage.setItem('spotter.theme',c)}catch(e){}paint(c)}b.forEach(function(x){x.addEventListener('click',function(){set(x.dataset.themeChoice)})});paint(cur())})()</script>`;
// The rail search button and "/" open the sidebar (on narrow screens) and focus its search box; without JS the link opens /traces.
const searchBoot = `<script>(function(){var i=document.getElementById('sidebar-search'),t=document.getElementById('nav-toggle');function go(e){if(!i)return;e.preventDefault();if(t)t.checked=true;i.focus()}var b=document.querySelector('[data-search]');if(b)b.addEventListener('click',go);document.addEventListener('keydown',function(e){var x=e.target;if(e.key!=='/'||e.metaKey||e.ctrlKey||x instanceof HTMLInputElement||x instanceof HTMLTextAreaElement||x instanceof HTMLSelectElement)return;go(e)})})()</script>`;

const count = (n: number): string => n.toLocaleString('en-US');

type NavItem = [Section, string, IconName, string, (s: Shell) => string];

const nav: NavItem[] = [
  ['issues', 'Issues', 'issue', urls.home(), (s) => `${count(s.counts.open)} open`],
  ['traces', 'Traces', 'trace', urls.traces(), (s) => count(s.counts.traces)],
  ['judges', 'Judges', 'judge', urls.judges(), (s) => `${count(s.counts.activeJudges)} active`],
  ['runs', 'Runs', 'run', urls.runs(), (s) => count(s.counts.runs)],
  ['datasets', 'Datasets', 'dataset', urls.datasets(), (s) => count(s.counts.datasets)],
];

const current = (on: boolean) => (on ? 'page' : undefined);

const RailLink = ({ href, label, icon, on, children }: { href: string; label: string; icon: IconName; on: boolean; children?: Child }) => (
  <a class="rail-btn" href={href} aria-label={label} title={label} aria-current={current(on)}>
    <Icon name={icon} />
    {children}
  </a>
);

const Rail = ({ section, shell }: { section: Section | null; shell: Shell }) => (
  <nav class="rail" aria-label="App">
    <a class="rail-brand" href={urls.home()} aria-label="Spotter" title="Spotter"><Icon name="paw" size="lg" /></a>
    <RailLink href={urls.home()} label="Issues" icon="inbox" on={section === 'issues'} />
    <a class="rail-btn" href={`${urls.traces()}#sidebar-search`} aria-label="Search" title="Search" data-search>
      <Icon name="search" />
    </a>
    <RailLink href={urls.notifications()} label="Notifications" icon="bell" on={section === 'notifications'}>
      {shell.unread > 0 ? <span class="badge">{shell.unread}</span> : null}
    </RailLink>
    <RailLink href={urls.settings()} label="Settings" icon="settings" on={section === 'settings'} />
    <label class="rail-btn menu" for="nav-toggle" aria-label="Menu" title="Menu"><Icon name="menu" /></label>
    <span class="avatar rail-foot" title={shell.project ?? 'All projects'}>{initials(shell.project ?? 'all')}</span>
  </nav>
);

const ProjectRow = ({ shell }: { shell: Shell }) =>
  shell.projects.length > 1 ? (
    <details class="project-row">
      <summary>
        <span class="strong">All projects</span>
        <Icon name="chevron" size="sm" />
      </summary>
      <div class="project-menu">
        {shell.projects.map((p) => (
          <a class="nav2" href={urls.issues({ project: p })}><span class="avatar">{initials(p)}</span><span class="label">{p}</span></a>
        ))}
      </div>
    </details>
  ) : (
    <div class="project-row">
      <span class="strong">{shell.project ?? 'No project yet'}</span>
    </div>
  );

const Sidebar = ({ section, shell }: { section: Section | null; shell: Shell }) => (
  <aside class="sidebar">
    <ProjectRow shell={shell} />
    <form class="sidebar-search" action={urls.traces()} method="get" role="search">
      <Icon name="search" size="sm" />
      <input class="input" id="sidebar-search" type="search" name="q" placeholder="Search traces" aria-label="Search traces" />
    </form>
    <nav class="nav" aria-label="Sections">
      {nav.map(([key, label, icon, href, meta]) => (
        <a class="nav2" href={href} aria-current={current(key === section)}>
          <span class="dot"><Icon name={icon} /></span>
          <span>
            <span class="label">{label}</span>
            <span class="meta">{meta(shell)}</span>
          </span>
        </a>
      ))}
    </nav>
  </aside>
);

const Tabs = ({ tabs }: { tabs: Tab[] }) => (
  <nav class="tabs" aria-label="Tabs">
    {tabs.map((t) => (
      <a class="tab" href={t.href} aria-current={current(t.current)}>
        {t.label}
        {t.count === undefined ? null : <span class="count">{count(t.count)}</span>}
      </a>
    ))}
  </nav>
);

const StatusBar = ({ shell }: { shell: Shell }) => (
  <footer class="statusbar">
    <span>
      <span>{shell.project ?? shell.db}</span>
      <span class="build">v{shell.version}</span>
    </span>
    <span>
      <a href={urls.home()}>{count(shell.counts.open)} open</a>
      <a href={urls.traces({ tab: 'unlabeled' })}>{count(shell.counts.unlabeled)} unlabeled</a>
      <span class="mcp" title={shell.mcp}><i class="live" aria-hidden="true"></i>MCP {shell.mcp.replace(/^https?:\/\//, '')}</span>
    </span>
  </footer>
);

export const Layout = ({ title, meta, section, shell, tabs, crumbs = [], action, script, aside, children }: Props) => (
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
          <input class="nav-toggle" type="checkbox" id="nav-toggle" />
          <Rail section={section} shell={shell} />
          <Sidebar section={section} shell={shell} />
          <div class="work">
            <main class="main">
              {tabs?.length ? <Tabs tabs={tabs} /> : null}
              <div class="container">
                <header class="page-title">
                  <div class="head">
                    {crumbs.length ? <Crumbs items={crumbs} /> : null}
                    <h1 class="t-title heavy">{title}</h1>
                    {meta ? <p class="meta muted">{meta}</p> : null}
                  </div>
                  {action ? <div class="actions">{action}</div> : null}
                </header>
                {children}
              </div>
            </main>
            {aside}
          </div>
          <StatusBar shell={shell} />
        </div>
        {raw(searchBoot)}
        {section === 'settings' ? raw(themeToggle) : null}
      </body>
    </html>
  </>
);
