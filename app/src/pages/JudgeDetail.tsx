import type { Disagreement } from '../services/disagreements.ts';
import type { IssueListRow } from '../services/issues.ts';
import { labelTarget, shownRow, type JudgeView, type VersionView } from '../services/judges.ts';
import { urls } from '../urls.ts';
import type { Shell } from './data.ts';
import { ActivateForm, DisagreementsLink, StatusPill } from './Judges.tsx';
import { VersionBody } from './JudgeVersion.tsx';
import { Layout, type Tab } from './Layout.tsx';
import { ago, Empty, Icon, JudgeStateIcon, judgeOptions, judgeStateLabel, pct, Prop, SeverityPill, short, since, State, StatusMenu, summarize } from './ui.tsx';

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
    <div class="list-row" data-row data-active={v.active ? '1' : undefined}>
      <a class="id num row-link" href={v.url}>v{v.number}</a>
      {v.active ? <span class="pill pill-pass"><Icon name="pass" size="sm" />Active</span> : null}
      <span class="grow muted">{`${v.note ?? v.model} · ${v.created_by}`}</span>
      {row ? <span class="meta num">{`TPR ${pct(row.tpr)} · TNR ${pct(row.tnr)} · n=${row.n}`}</span> : <StatusPill status="needs_labels" />}
      {v.active && disagreements !== null ? <DisagreementsLink name={name} number={v.number} count={disagreements} /> : null}
      {!v.active && v.calibrated ? <ActivateForm name={name} number={v.number} /> : null}
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
    <div class="card card-flush" data-list>{judge.versions.map((v) => <Version name={judge.name} version={v} disagreements={disagreements} />)}</div>
  ) : (
    <Empty icon="judge" title="No versions yet" />
  );

const Disagreements = ({ judge, items }: { judge: JudgeView; items: Disagreement[] }) =>
  items.length ? (
    <div class="stack">
      <div class="cluster">
        <a class="btn btn-secondary" href={urls.judgeDisagreements(judge.name, judge.active_version ?? 1)}><Icon name="flag" size="sm" />Review queue</a>
      </div>
      <div class="card card-flush" data-list>
        {items.map((d) => (
          <div class="list-row" data-row>
            <a class="id mono row-link" href={d.url}>{short(d.trace_id)}</a>
            <span class="meta">{`human ${verdict(d.human.value)} · judge ${verdict(d.judge.value)}`}</span>
            <span class="grow muted">{summarize(d.output)}</span>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <Empty icon="pass" title={judge.active_version === null ? 'No active version' : 'No disagreements'} />
  );

const Issues = ({ items }: { items: IssueListRow[] }) =>
  items.length ? (
    <div class="card card-flush" data-list>
      {items.map((i) => (
        <div class="list-row" data-row>
          <State status={i.status} />
          <a class="grow strong row-link" href={i.url}>{i.title}</a>
          <SeverityPill severity={i.severity} />
          <span class="meta num" title={i.updated_at}>{ago(i.updated_at)}</span>
        </div>
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
          <Prop name="Active version" icon="backtest" field>
            <select class="input" name="version" aria-label="Active version" data-activate disabled={judge.versions.length ? undefined : true}>
              {judge.versions.length ? [...judge.versions].reverse().map(versionOption) : <option>none</option>}
            </select>
          </Prop>
          <Prop name="Description" icon="menu" field>
            <input class="input" name="description" aria-label="Description" placeholder="Add a description" value={judge.description ?? ''} data-description />
          </Prop>
          <div class="prop"><dt class="sr">Calibration status</dt><dd><StatusPill status={judge.status} /></dd></div>
          <Prop name="Labels collected" icon="score" class="num">{`${judge.labels}/${labelTarget} labels`}</Prop>
          <Prop name="TPR" icon="pass" class="num" empty="No TPR yet">{row ? `TPR ${pct(row.tpr)}` : null}</Prop>
          <Prop name="TNR" icon="pass" class="num" empty="No TNR yet">{row ? `TNR ${pct(row.tnr)}` : null}</Prop>
          <Prop name="Scope" icon="settings" empty="No active version">{active ? `${active.scope} scope` : null}</Prop>
          <Prop name="Model" icon="judge" empty="No active version">{active?.model ?? null}</Prop>
          <Prop name="Created" icon="time" class="num" hint={judge.created_at}>{since('Created', judge.created_at)}</Prop>
        </dl>
        <p class="error" data-error></p>
      </section>
      <section>
        <h2>Relations</h2>
        <dl>
          <Prop name="Versions" icon="backtest"><a class="link" href={urls.judge(judge.name, 'versions')}>{plural(judge.versions.length, 'version')}</a></Prop>
          <Prop name="Disagreements" icon="flag"><a class="link" href={urls.judge(judge.name, 'disagreements')}>{plural(disagreements, 'disagreement')}</a></Prop>
          <Prop name="Open issues" icon="issue"><a class="link" href={urls.judge(judge.name, 'issues')}>{plural(openIssues, 'open issue')}</a></Prop>
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
      heading
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
