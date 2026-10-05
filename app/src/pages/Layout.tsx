import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import type { IconName } from '../../../design-system/src/icons.ts';
import { font } from '../../../design-system/src/tokens.ts';
import { urls } from '../urls.ts';
import { initials, type Shell } from './data.ts';
import { type Crumb, Icon, sprite } from './ui.tsx';

export type Section = 'issues' | 'runs' | 'datasets' | 'traces' | 'judges' | 'notifications' | 'settings';

export type Tab = { href: string; label: string; count?: number; current: boolean };

type Props = {
  /** Document title. The header's current crumb shows it unless `current` says otherwise. */
  title: string;
  /** Show the title and meta in the body. Detail pages only; lists and tools let the header name them. */
  heading?: boolean;
  meta?: Child;
  section: Section | null;
  shell: Shell;
  tabs?: Tab[];
  /** Parent links between the project and the current page. */
  crumbs?: Crumb[];
  current?: string;
  /** Icon buttons for the right end of the header. */
  actions?: Child;
  /** Which keymap view the page uses. Defaults to `detail` when `heading` is set, else `list`. */
  view?: 'list' | 'detail' | 'review';
  script?: string;
  aside?: Child;
  children: Child;
};

// Runs before the stylesheet so a saved theme never flashes the other one.
const themeBoot = `<script>try{var t=localStorage.getItem('spotter.theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>`;
const themeToggle = `<script>(function(){var r=document.documentElement,b=document.querySelectorAll('[data-theme-choice]');function cur(){try{return localStorage.getItem('spotter.theme')||'system'}catch(e){return 'system'}}function paint(c){b.forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.themeChoice===c))})}function set(c){if(c==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',c);try{if(c==='system')localStorage.removeItem('spotter.theme');else localStorage.setItem('spotter.theme',c)}catch(e){}paint(c)}b.forEach(function(x){x.addEventListener('click',function(){set(x.dataset.themeChoice)})});paint(cur())})()</script>`;
const count = (n: number): string => n.toLocaleString('en-US');

type NavItem = [Section, string, IconName, string, (s: Shell) => string, string];

const nav: NavItem[] = [
  ['issues', 'Issues', 'issue', urls.home(), (s) => count(s.counts.open), 'Open issues'],
  ['traces', 'Traces', 'trace', urls.traces(), (s) => count(s.counts.traces), 'Traces'],
  ['judges', 'Judges', 'judge', urls.judges(), (s) => count(s.counts.activeJudges), 'Active judges'],
  ['runs', 'Runs', 'run', urls.runs(), (s) => count(s.counts.runs), 'Runs'],
  ['datasets', 'Datasets', 'dataset', urls.datasets(), (s) => count(s.counts.datasets), 'Datasets'],
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
        <span>All projects</span>
        <Icon name="chevron" size="sm" />
      </summary>
      <div class="project-menu menu-panel">
        {shell.projects.map((p) => (
          <a class="nav2" href={urls.issues({ project: p })}><span class="label">{p}</span></a>
        ))}
      </div>
    </details>
  ) : (
    <div class="project-row">
      <span>{shell.project ?? 'No project yet'}</span>
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
      {nav.map(([key, label, icon, href, meta, hint]) => (
        <a class="nav2" href={href} aria-current={current(key === section)}>
          <Icon name={icon} size="sm" />
          <span class="label">{label}</span>
          <span class="meta" title={hint}>{meta(shell)}</span>
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

type HeaderProps = { project: string | null; crumbs: Crumb[]; current: string; named: boolean; actions?: Child };

const Header = ({ project, crumbs, current, named, actions }: HeaderProps) => {
  const parents: Crumb[] = project ? [[urls.home(), project], ...crumbs] : crumbs;
  return (
    <header class="header">
      <nav class="crumbs" aria-label="Breadcrumb">
        {parents.map(([href, label]) => (
          <>
            <a class="crumb" href={href}>{label}</a>
            <Icon name="crumb" size="sm" />
          </>
        ))}
        {named ? <span class="crumb-current">{current}</span> : <h1 class="crumb-current">{current}</h1>}
      </nav>
      {actions ? <div class="header-actions">{actions}</div> : null}
    </header>
  );
};

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

export const Layout = ({ title, heading = false, meta, section, shell, tabs, crumbs = [], current, actions, view, script, aside, children }: Props) => {
  const keyView = view ?? (heading ? 'detail' : 'list');
  const back = crumbs.at(-1)?.[0];
  return (
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
          <script type="module" src={`/client/${script ?? (keyView === 'detail' ? 'detail' : 'shell')}.js`}></script>
        </head>
        <body data-view={keyView} data-back={keyView === 'list' ? undefined : back}>
          {sprite}
          <div class="shell">
            <input class="nav-toggle" type="checkbox" id="nav-toggle" />
            <Rail section={section} shell={shell} />
            <Sidebar section={section} shell={shell} />
            <div class="work">
              <Header project={shell.project} crumbs={crumbs} current={current ?? title} named={heading} actions={actions} />
              <div class="work-body">
                <main class="main">
                  {tabs?.length ? <Tabs tabs={tabs} /> : null}
                  <div class={heading ? 'container detail' : 'container no-title'}>
                    {heading ? (
                      <div class="page-title">
                        <div class="head">
                          <h1 class="t-title">{title}</h1>
                          {meta ? <p class="meta muted">{meta}</p> : null}
                        </div>
                      </div>
                    ) : null}
                    {children}
                  </div>
                </main>
                {aside}
              </div>
            </div>
            <StatusBar shell={shell} />
          </div>
          {section === 'settings' ? raw(themeToggle) : null}
        </body>
      </html>
    </>
  );
};
