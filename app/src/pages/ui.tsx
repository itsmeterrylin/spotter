import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import { type IconName, iconNames, iconPaths } from '../../../design-system/src/icons.ts';
import type { Json } from '../db/types.ts';
import { urls } from '../urls.ts';

export const sprite = raw(
  `<svg hidden xmlns="http://www.w3.org/2000/svg">${iconNames.map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24">${iconPaths[n]}</symbol>`).join('')}</svg>`,
);

type IconProps = { name: IconName; size?: 'sm' | 'md' | 'lg'; label?: string };

export const Icon = ({ name, size = 'md', label }: IconProps) =>
  raw(`<svg class="ic${size === 'md' ? '' : ` ic-${size}`}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><use href="#i-${name}"/></svg>`);

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

export const Crumbs = ({ items }: { items: Array<[string, string]> }) => (
  <nav class="crumbs t-caption">
    <a href={urls.inbox()}>Inbox</a>
    {items.map(([href, label]) => (
      <>
        <Icon name="next" size="sm" />
        <a href={href}>{label}</a>
      </>
    ))}
  </nav>
);

export const Empty = ({ icon, title, action }: { icon: IconName; title: string; action?: Child }) => (
  <div class="card empty">
    <Icon name={icon} size="lg" />
    <span class="t-title">{title}</span>
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
  return typeof v !== 'string' && s.length > 80 ? `${s.slice(0, 77)}...` : s;
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
