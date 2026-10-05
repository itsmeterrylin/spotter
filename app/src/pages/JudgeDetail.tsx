import type { Disagreement } from '../services/disagreements.ts';
import type { IssueListRow } from '../services/issues.ts';
import { labelTarget, shownRow, type JudgeView, type VersionView } from '../services/judges.ts';
import { urls } from '../urls.ts';
import type { Shell } from './data.ts';
import { ActivateForm, DisagreementsLink, Rates, StatusPill } from './Judges.tsx';
import { VersionBody } from './JudgeVersion.tsx';
import { Layout, type Tab } from './Layout.tsx';
import { ago, Empty, Icon, JudgeStateIcon, judgeOptions, judgeStateLabel, pct, PropValue, SeverityPill, short, State, StatusMenu, summarize } from './ui.tsx';

export type JudgeTab = 'overview' | 'versions' | 'disagreements' | 'issues';

type Props = { judge: JudgeView; tab: JudgeTab; disagreements: Disagreement[]; issues: IssueListRow[]; shell: Shell };

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

const tabs = (judge: JudgeView, tab: JudgeTab, disagreements: number, issues: number): Tab[] => [
  { href: urls.judge(judge.name), label: 'Overview', current: tab === 'overview' },
  { href: urls.judge(judge.name, 'versions'), label: 'Versions', count: judge.versions.length, current: tab === 'versions' },
  { href: urls.judge(judge.name, 'disagreements'), label: 'Disagreements', count: disagreements, current: tab === 'disagreements' },
  { href: urls.judge(judge.name, 'issues'), label: 'Issues', count: issues, current: tab === 'issues' },
];

const Version = ({ name, version: v, disagreements }: { name: string; version: VersionView; disagreements: number | null }) => {
  const row = shownRow(v.calibration);
  return (
    <div class="version" data-active={v.active ? '1' : undefined}>
      <div class="stack" style="--gap: 4px">
        <a class="link t-heading num" href={v.url}>v{v.number}</a>
        {v.active ? <span class="pill pill-pass"><Icon name="pass" size="sm" />Active</span> : null}
      </div>
      <div class="stack">
        <span class="muted note">
          {v.note ?? v.model} <span class="muted">· {v.created_by}</span>
        </span>
        {row ? <Rates row={row} /> : <StatusPill status="needs_labels" />}
      </div>
      <div class="actions">
        {v.active && disagreements !== null ? <DisagreementsLink name={name} number={v.number} count={disagreements} /> : null}
        {!v.active && v.calibrated ? <ActivateForm name={name} number={v.number} /> : null}
      </div>
    </div>
  );
};

const verdict = (value: number): string => (value >= 0.5 ? 'pass' : 'fail');

const Overview = ({ judge, disagreements }: { judge: JudgeView; disagreements: number }) => {
  const active = judge.versions.find((v) => v.active);
  if (!active) return <Empty icon="judge" title="No versions yet" />;
  return (
    <div class="review definition">
      <VersionBody judge={judge} version={active} disagreements={disagreements} />
    </div>
  );
};

const Versions = ({ judge, disagreements }: { judge: JudgeView; disagreements: number | null }) =>
  judge.versions.length ? (
    <div class="timeline">{judge.versions.map((v) => <Version name={judge.name} version={v} disagreements={disagreements} />)}</div>
  ) : (
    <Empty icon="judge" title="No versions yet" />
  );

const Disagreements = ({ judge, items }: { judge: JudgeView; items: Disagreement[] }) =>
  items.length ? (
    <div class="stack">
      <div class="cluster">
        <a class="btn btn-secondary" href={urls.judgeDisagreements(judge.name, judge.active_version ?? 1)}><Icon name="flag" size="sm" />Review queue</a>
      </div>
      <div class="card card-flush">
        {items.map((d) => (
          <a class="list-row" href={d.url}>
            <span class="avatar avatar-sm"><Icon name="trace" size="sm" /></span>
            <span class="mono strong">{short(d.trace_id)}</span>
            <span class="meta">{`human ${verdict(d.human.value)} · judge ${verdict(d.judge.value)}`}</span>
            <span class="grow muted">{summarize(d.output)}</span>
          </a>
        ))}
      </div>
    </div>
  ) : (
    <Empty icon="pass" title={judge.active_version === null ? 'No active version' : 'No disagreements'} />
  );

const Issues = ({ items }: { items: IssueListRow[] }) =>
  items.length ? (
    <div class="card card-flush">
      {items.map((i) => (
        <a class="list-row" href={i.url}>
          <State status={i.status} />
          <span class="grow strong">{i.title}</span>
          <SeverityPill severity={i.severity} />
          <span class="meta num" title={i.updated_at}>{ago(i.updated_at)}</span>
        </a>
      ))}
    </div>
  ) : (
    <Empty icon="issue" title="No linked issues" />
  );

const versionOption = (v: VersionView) => (
  <option value={String(v.number)} selected={v.active}>{`v${v.number}${v.calibrated ? ' · calibrated' : ''}`}</option>
);

const Properties = ({ judge, disagreements, openIssues }: { judge: JudgeView; disagreements: number; openIssues: number }) => {
  const active = judge.versions.find((v) => v.active);
  const row = active ? shownRow(active.calibration) : null;
  return (
    <aside class="aside" aria-label="Judge" data-judge={judge.name}>
      <section class="stack" style="--gap: var(--space-8)">
        <h2>Status</h2>
        <StatusMenu kind="judge" id={judge.name} current={judge.state} options={judgeOptions(judge.state, judge.live_blocker)} variant="field" reload />
      </section>
      <section>
        <h2>Properties</h2>
        <dl>
          <div class="prop">
            <dt>Active version</dt>
            <dd>
              <select class="input" name="version" aria-label="Active version" data-activate disabled={judge.versions.length ? undefined : true}>
                {judge.versions.length ? [...judge.versions].reverse().map(versionOption) : <option>none</option>}
              </select>
            </dd>
          </div>
          <div class="prop">
            <dt>Description</dt>
            <dd><input class="input" name="description" aria-label="Description" placeholder="Add a description" value={judge.description ?? ''} data-description /></dd>
          </div>
        </dl>
        <p class="error" data-error></p>
      </section>
      <section>
        <h2>Facts</h2>
        <dl>
          <div class="prop"><dt>Calibration status</dt><dd><StatusPill status={judge.status} /></dd></div>
          <div class="prop"><dt>Labels collected</dt><dd><PropValue icon="score" class="num">{judge.labels}/{labelTarget}</PropValue></dd></div>
          <div class="prop"><dt>TPR</dt><dd><PropValue icon="pass" class="num">{row ? pct(row.tpr) : '–'}</PropValue></dd></div>
          <div class="prop"><dt>TNR</dt><dd><PropValue icon="pass" class="num">{row ? pct(row.tnr) : '–'}</PropValue></dd></div>
          <div class="prop"><dt>Scope</dt><dd><PropValue icon="settings">{active?.scope ?? '–'}</PropValue></dd></div>
          <div class="prop"><dt>Model</dt><dd><PropValue icon="judge">{active?.model ?? '–'}</PropValue></dd></div>
          <div class="prop"><dt>Created</dt><dd><PropValue icon="time" class="num" title={judge.created_at}>{ago(judge.created_at)}</PropValue></dd></div>
        </dl>
      </section>
      <section>
        <h2>Relations</h2>
        <dl>
          <div class="prop"><dt>Versions</dt><dd><PropValue icon="backtest"><a class="link" href={urls.judge(judge.name, 'versions')}>{plural(judge.versions.length, 'version')}</a></PropValue></dd></div>
          <div class="prop"><dt>Disagreements</dt><dd><PropValue icon="flag"><a class="link" href={urls.judge(judge.name, 'disagreements')}>{disagreements}</a></PropValue></dd></div>
          <div class="prop"><dt>Open issues</dt><dd><PropValue icon="issue"><a class="link" href={urls.judge(judge.name, 'issues')}>{openIssues}</a></PropValue></dd></div>
        </dl>
      </section>
    </aside>
  );
};

export const JudgePage = ({ judge, tab, disagreements, issues, shell }: Props) => {
  const openIssues = issues.filter((i) => i.status === 'open').length;
  const active = judge.versions.find((v) => v.active);
  return (
    <Layout
      title={judge.name}
      meta={`${judgeStateLabel[judge.state]}${active ? ` · v${active.number} active` : ''} · ${plural(judge.versions.length, 'version')}`}
      section="judges"
      shell={shell}
      tabs={tabs(judge, tab, disagreements.length, issues.length)}
      crumbs={[[urls.judges(), 'Judges']]}
      script="judge"
      aside={<Properties judge={judge} disagreements={disagreements.length} openIssues={openIssues} />}
    >
      {tab === 'overview' ? <Overview judge={judge} disagreements={disagreements.length} /> : null}
      {tab === 'versions' ? <Versions judge={judge} disagreements={active ? disagreements.length : null} /> : null}
      {tab === 'disagreements' ? <Disagreements judge={judge} items={disagreements} /> : null}
      {tab === 'issues' ? <Issues items={issues} /> : null}
    </Layout>
  );
};
