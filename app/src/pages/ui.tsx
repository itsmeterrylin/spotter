import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import { type IconName, iconNames, iconPaths } from '../../../design-system/src/icons.ts';
import type { IssueStatus, Json, JudgeState, Severity } from '../db/types.ts';
import { issueStatuses, transitions } from '../services/issues.ts';
import { judgeStates, judgeTransitions } from '../services/judges.ts';

export const sprite = raw(
  `<svg hidden xmlns="http://www.w3.org/2000/svg">${iconNames.map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24">${iconPaths[n]}</symbol>`).join('')}</svg>`,
);

type IconProps = { name: IconName; size?: 'sm' | 'md' | 'lg'; label?: string };

export const Icon = ({ name, size = 'md', label }: IconProps) =>
  raw(`<svg class="ic${size === 'md' ? '' : ` ic-${size}`}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><use href="#i-${name}"/></svg>`);

type PropProps = {
  name: string;
  icon: IconName;
  children?: Child;
  /** Action phrase shown, muted, when children is empty. */
  empty?: Child;
  class?: string;
  hint?: string;
  field?: boolean;
};

const blank = (c: Child): boolean => c === null || c === undefined || c === '' || c === false;

/** One Linear-style property row: icon and value on a single line. The name is a visually hidden dt and the hover title. */
export const Prop = ({ name, icon, children, empty, class: cls, hint, field }: PropProps) => {
  const isEmpty = blank(children);
  const classes = ['propbtn', field ? 'propfield' : '', isEmpty ? 'is-empty' : (cls ?? '')].filter(Boolean).join(' ');
  return (
    <div class="prop">
      <dt class="sr">{name}</dt>
      <dd>
        <span class={classes} title={hint ? `${name}: ${hint}` : name}>
          <Icon name={icon} />
          {isEmpty ? empty : children}
        </span>
      </dd>
    </div>
  );
};

/** "Created 3d ago", "Updated now", or "Created 2026-09-01" for old dates. */
export const since = (prefix: string, iso: string): string => {
  const a = ago(iso);
  return /^\d+[mhd]$/.test(a) ? `${prefix} ${a} ago` : `${prefix} ${a}`;
};

export const pct = (x: number): string => (x >= 0 && x <= 1 ? `${Math.round(x * 100)}%` : x.toFixed(2));

const pts = (d: number): string => (Math.abs(d) <= 1 ? `${Math.abs(Math.round(d * 100))} pts` : Math.abs(d).toFixed(2));

export const Delta = ({ value }: { value: number | null }) => {
  if (value === null) return null;
  const sign = Math.round(value * 1000);
  if (sign === 0) return <span class="delta muted num"><Icon name="flat" size="sm" label="no change" />0</span>;
  return (
    <span class={`delta num ${sign > 0 ? 'pos' : 'neg'}`}>
      <Icon name={sign > 0 ? 'up' : 'down'} size="sm" label={sign > 0 ? 'up' : 'down'} />
      {pts(value)}
    </span>
  );
};

export type Crumb = [string, string];

/** A 28px round icon action for the header. The label is the tooltip and the accessible name. */
export const IconButton = ({ href, icon, label }: { href: string; icon: IconName; label: string }) => (
  <a class="btn btn-icon" href={href} title={label} aria-label={label}><Icon name={icon} /></a>
);

export const Empty = ({ icon, title, action }: { icon: IconName; title: string; action?: Child }) => (
  <div class="card empty">
    <Icon name={icon} size="lg" />
    {title ? <span class="t-heading">{title}</span> : null}
    {action}
  </div>
);

const scalar = (v: Json): v is string | number | boolean => typeof v !== 'object' || v === null;

const scalarText = (v: Json): string => (scalar(v) ? String(v) : JSON.stringify(v));

export const joined = (v: Json | null | undefined): string => {
  if (v === null || v === undefined) return '';
  if (scalar(v)) return String(v);
  if (Array.isArray(v)) return v.map(scalarText).join(' · ');
  return typeof v.transcript === 'string' ? v.transcript : Object.values(v).map(scalarText).join(' · ');
};

export const summarize = (v: Json | null | undefined): string => {
  const s = joined(v);
  return s.length > 80 ? `${s.slice(0, 77)}...` : s;
};

export const Values = ({ value }: { value: Json | null | undefined }) =>
  value === null || value === undefined ? <p class="muted">none</p> : <p class="transcript values">{joined(value)}</p>;

export const JsonView = ({ value }: { value: Json | null | undefined }) => {
  if (value === null || value === undefined) return <p class="muted">none</p>;
  if (scalar(value)) return <p class="transcript">{String(value)}</p>;
  if (!Array.isArray(value) && Object.values(value).every(scalar)) {
    return (
      <dl class="kv">
        {Object.entries(value).map(([k, v]) => (
          <>
            <dt>{k}</dt>
            <dd>{String(v)}</dd>
          </>
        ))}
      </dl>
    );
  }
  return <div class="transcript"><pre class="mono">{JSON.stringify(value, null, 2)}</pre></div>;
};

export type Verdict = 'pass' | 'fail' | 'defer';

export const VerdictPill = ({ verdict }: { verdict: Verdict | null }) =>
  verdict ? (
    <span class={`pill pill-${verdict}`}><Icon name={verdict} size="sm" />{verdict}</span>
  ) : (
    <span class="pill"><Icon name="time" size="sm" />unlabeled</span>
  );

export const short = (id: string): string => (id.length > 16 ? id.slice(-12) : id);

const minute = 60_000;

export const ago = (iso: string, now: number = Date.now()): string => {
  const m = Math.max(0, Math.floor((now - Date.parse(iso)) / minute));
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 60 * 24) return `${Math.floor(m / 60)}h`;
  if (m < 60 * 24 * 30) return `${Math.floor(m / (60 * 24))}d`;
  return iso.slice(0, 10);
};

export const statusLabel: Record<IssueStatus, string> = { open: 'Open', confirmed: 'Confirmed', dismissed: 'Dismissed' };
export const severityPill: Record<Severity, string> = { low: 'pill', medium: 'pill pill-defer', high: 'pill pill-fail' };

export const State = ({ status }: { status: IssueStatus }) => (
  <span class={`state${status === 'open' ? '' : ` state-${status}`}`} role="img" aria-label={statusLabel[status]}></span>
);

export const SeverityPill = ({ severity }: { severity: Severity }) => <span class={severityPill[severity]}>{severity}</span>;

export const judgeStateLabel: Record<JudgeState, string> = { draft: 'Draft', live: 'Live', paused: 'Paused' };
const judgeStateIcon: Record<JudgeState, IconName> = { draft: 'stateDraft', live: 'stateLive', paused: 'statePaused' };

export const JudgeStateIcon = ({ state }: { state: JudgeState }) => (
  <span class={`stico st-${state}`} role="img" aria-label={judgeStateLabel[state]}>
    <Icon name={judgeStateIcon[state]} size="sm" />
  </span>
);

export type StatusOption = { value: string; label: string; icon: Child; needsReason?: boolean; disabledReason?: string };

const humanMay = <S extends string>(table: Record<S, Partial<Record<S, readonly string[]>>>, from: S, to: S): boolean => table[from][to]?.includes('human') ?? false;

/** Options for an issue's status menu. `from` null means a bulk menu, where every move is offered. */
export const issueOptions = (from: IssueStatus | null): StatusOption[] =>
  issueStatuses.map((s) => ({
    value: s,
    label: statusLabel[s],
    icon: <State status={s} />,
    needsReason: s === 'dismissed',
    disabledReason: from === null || s === from || humanMay(transitions, from, s) ? undefined : `Cannot move from ${statusLabel[from]} to ${statusLabel[s]}`,
  }));

const judgeBlock = (from: JudgeState, to: JudgeState, liveBlocker: string | null): string | undefined => {
  if (from === to) return undefined;
  if (!judgeTransitions[from][to]) return `Cannot move from ${judgeStateLabel[from]} to ${judgeStateLabel[to]}`;
  if (!humanMay(judgeTransitions, from, to)) return `Only an agent can move from ${judgeStateLabel[from]} to ${judgeStateLabel[to]}`;
  return to === 'live' && liveBlocker ? `Cannot go live: ${liveBlocker}` : undefined;
};

/** Options for a judge's state menu. `from` null means a bulk menu, where every move is offered. */
export const judgeOptions = (from: JudgeState | null, liveBlocker: string | null = null): StatusOption[] =>
  judgeStates.map((s) => ({ value: s, label: judgeStateLabel[s], icon: <JudgeStateIcon state={s} />, disabledReason: from === null ? undefined : judgeBlock(from, s, liveBlocker) }));

export const severityLabel: Record<Severity, string> = { low: 'Low', medium: 'Medium', high: 'High' };

/** Options for an issue's severity menu. Any human may move between any two. */
export const severityOptions: StatusOption[] = (['low', 'medium', 'high'] as const).map((s) => ({
  value: s,
  label: severityLabel[s],
  icon: <span class={`sev sev-${s}`}><Icon name="flag" /></span>,
}));

type StatusMenuProps = {
  kind: 'issue' | 'judge' | 'severity';
  id: string;
  current: string | null;
  options: StatusOption[];
  variant?: 'icon' | 'field' | 'bulk';
  reload?: boolean;
  /** What the menu changes. Names the trigger and the search box. */
  noun?: string;
};

const Trigger = ({ variant, current, noun }: { variant: 'icon' | 'field' | 'bulk'; current: StatusOption | undefined; noun: string }) => {
  const common = { type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'data-status-trigger': true } as const;
  const Noun = noun[0]?.toUpperCase() + noun.slice(1);
  if (variant === 'bulk') return <button class="btn btn-secondary" {...common}>{Noun}</button>;
  const label = `${Noun}: ${current?.label ?? 'none'}`;
  if (variant === 'field') return <button class="propbtn" {...common} aria-label={label} title={Noun}>{current?.icon}{current?.label}</button>;
  return <button class="status-trigger" {...common} aria-label={label} title={`Change ${noun} (S)`}>{current?.icon}</button>;
};

/** Trigger plus a hidden popover. client/statusMenu.ts wires it through the data attributes. */
export const StatusMenu = ({ kind, id, current, options, variant = 'icon', reload, noun = 'status' }: StatusMenuProps) => (
  <span class="status-menu" data-status-menu data-kind={kind} data-id={id} data-current={current ?? undefined} data-variant={variant} data-reload={reload ? '1' : undefined} data-up={variant === 'bulk' ? '1' : undefined}>
    <Trigger variant={variant} current={options.find((o) => o.value === current)} noun={noun} />
    <div class="status-popover menu-panel" role="menu" aria-label={`Change ${noun}`} data-status-popover hidden>
      <div class="status-search">
        <input type="text" placeholder={`Change ${noun}...`} aria-label={`Change ${noun}`} autocomplete="off" data-status-search />
        <kbd class="kbd">S</kbd>
      </div>
      <div class="status-items">
        {options.map((o, i) => (
          <button
            class="status-item"
            type="button"
            role="menuitemradio"
            aria-checked={String(o.value === current)}
            aria-disabled={o.disabledReason ? 'true' : undefined}
            title={o.disabledReason}
            data-value={o.value}
            data-label={o.label}
            data-needs-reason={o.needsReason ? '1' : undefined}
          >
            <span class="status-ico">{o.icon}</span>
            <span class="status-label">{o.label}</span>
            {o.value === current ? <Icon name="pass" size="sm" /> : null}
            <span class="status-key">{i + 1}</span>
          </button>
        ))}
      </div>
      <p class="error status-error" data-error></p>
    </div>
  </span>
);

export const RowCheck = ({ label }: { label: string }) => <input type="checkbox" class="row-check" aria-label={`Select ${label}`} data-row-check />;

/** Bottom bar of a list: shows the selection count and offers the same status menu for every selected row. */
export const BulkBar = ({ kind, options, reason }: { kind: 'issue' | 'judge'; options: StatusOption[]; reason?: boolean }) => (
  <div class="bulk-bar" data-bulk-bar hidden>
    <span class="bulk-count num" data-bulk-count></span>
    <StatusMenu kind={kind} id="bulk" current={null} options={options} variant="bulk" />
    {reason ? (
      <form class="bulk-reason" data-bulk-reason hidden>
        <input class="input" name="reason" placeholder="Reason" aria-label="Reason" required />
        <button class="btn btn-fail" type="submit"><Icon name="dismiss" size="sm" />Dismiss</button>
      </form>
    ) : null}
    <button class="btn btn-ghost" type="button" data-bulk-clear>Clear</button>
    <p class="error" data-bulk-error></p>
  </div>
);
