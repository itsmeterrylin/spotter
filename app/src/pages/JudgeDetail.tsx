import type { Child } from 'hono/jsx';
import type { Disagreement } from '../services/disagreements.ts';
import type { IssueListRow } from '../services/issues.ts';
import { labelTarget, shownRow, type JudgeView, type VersionView } from '../services/judges.ts';
import { urls } from '../urls.ts';
import type { Shell } from './data.ts';
import { ActivateForm, DisagreementsLink, StatusPill } from './judgeParts.tsx';
import { VersionBody } from './JudgeVersion.tsx';
import { Layout, type Tab } from './Layout.tsx';
import { Panel } from './panels.tsx';
import { PeekRegion, peekRow } from './Peek.tsx';
import { ago, Empty, Icon, judgeStateLabel, pct, SeverityPill, short, State, summarize } from './ui.tsx';

export type JudgeTab = 'overview' | 'versions' | 'disagreements' | 'issues';

type Props = { judge: JudgeView; tab: JudgeTab; disagreements: Disagreement[]; issues: IssueListRow[]; shell: Shell; selected?: string; pane?: Child };

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

const tabs = (judge: JudgeView, tab: JudgeTab, disagreements: number, issues: number): Tab[] => [
  { href: urls.judge(judge.name), label: 'Overview', current: tab === 'overview' },
  { href: urls.judge(judge.name, 'versions'), label: 'Versions', count: judge.versions.length, current: tab === 'versions' },
  { href: urls.judge(judge.name, 'disagreements'), label: 'Disagreements', count: disagreements, current: tab === 'disagreements' },
  { href: urls.judge(judge.name, 'issues'), label: 'Issues', count: issues, current: tab === 'issues' },
];

const Version = ({ name, version: v, disagreements, selected }: { name: string; version: VersionView; disagreements: number | null; selected?: string }) => {
  const row = shownRow(v.calibration);
  return (
    <div class="list-row" data-row data-active={v.active ? '1' : undefined} {...peekRow({ kind: 'version', name, number: v.number }, selected)}>
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

const Versions = ({ judge, disagreements, selected }: { judge: JudgeView; disagreements: number | null; selected?: string }) =>
  judge.versions.length ? (
    <div class="card card-flush" data-list>{judge.versions.map((v) => <Version name={judge.name} version={v} disagreements={disagreements} selected={selected} />)}</div>
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

const Issues = ({ items, selected }: { items: IssueListRow[]; selected?: string }) =>
  items.length ? (
    <div class="card card-flush" data-list>
      {items.map((i) => (
        <div class="list-row" data-row {...peekRow({ kind: 'issue', id: i.id }, selected)}>
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

export const JudgePage = ({ judge, tab, disagreements, issues, shell, selected, pane }: Props) => {
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
      aside={
        <>
          <aside class="aside" aria-label="Judge"><Panel data={{ kind: 'judge', judge, disagreements: disagreements.length, openIssues }} /></aside>
          <PeekRegion>{pane}</PeekRegion>
        </>
      }
    >
      {tab === 'overview' ? <Overview judge={judge} disagreements={disagreements.length} /> : null}
      {tab === 'versions' ? <Versions judge={judge} disagreements={active ? disagreements.length : null} selected={selected} /> : null}
      {tab === 'disagreements' ? <Disagreements judge={judge} items={disagreements} /> : null}
      {tab === 'issues' ? <Issues items={issues} selected={selected} /> : null}
    </Layout>
  );
};
