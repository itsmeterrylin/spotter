import type { Child } from 'hono/jsx';
import type { Judge } from '../db/repos/judge.ts';
import type { IssueStatus } from '../db/types.ts';
import { type IssueListRow, type IssueView, issueStatuses, type OccurrenceView } from '../services/issues.ts';
import type { TraceView } from '../services/traces.ts';
import { urls } from '../urls.ts';
import { initials, type Shell } from './data.ts';
import { Layout, type Tab } from './Layout.tsx';
import { Turns } from './Trace.tsx';
import { ago, BulkBar, Empty, Icon, issueOptions, pct, PropValue, RowCheck, SeverityPill, severityPill, short, State, StatusMenu, statusLabel, Values } from './ui.tsx';

export type IssueTab = 'overview' | 'traces' | 'backtest';

const turnLabel = (turn: number | null): string => (turn === null ? 'whole trace' : `turn ${turn}`);

type ListProps = { issues: IssueListRow[]; status: IssueStatus; counts: Record<IssueStatus, number>; project?: string; shell: Shell };

const listTabs = (status: IssueStatus, counts: Record<IssueStatus, number>, project?: string): Tab[] =>
  issueStatuses.map((s) => ({ href: s === 'open' && !project ? urls.home() : urls.issues({ status: s, project }), label: statusLabel[s], count: counts[s], current: s === status }));

export const IssuesPage = ({ issues, status, counts, project, shell }: ListProps) => (
  <Layout title="Issues" meta={`${counts[status]} ${status}${project ? ` · ${project}` : ''}`} section="issues" shell={shell} tabs={listTabs(status, counts, project)} script="issues">
    {issues.length ? (
      <div class="card card-flush issue-list" data-list data-status={status}>
        <div class="group-head"><State status={status} />{statusLabel[status]}<span class="count">{issues.length}</span></div>
        {issues.map((i) => (
          <div class="list-row" data-row data-id={i.id}>
            <RowCheck label={i.title} />
            <StatusMenu kind="issue" id={i.id} current={i.status} options={issueOptions(i.status)} />
            <a class="grow strong row-link" href={i.url}>{i.title}</a>
            <span class="meta num" title="Occurrences"><Icon name="trace" size="sm" />{i.occurrences}</span>
            <SeverityPill severity={i.severity} />
            <span class="meta judge-name">{i.judge_name ?? ''}</span>
            <span class="meta num updated" title={i.updated_at}>{ago(i.updated_at)}</span>
          </div>
        ))}
        <form class="row-dismiss" id="row-dismiss" hidden>
          <input class="input" name="reason" placeholder="Reason" aria-label="Reason" required />
          <button class="btn btn-fail" type="submit"><Icon name="dismiss" size="sm" />Dismiss</button>
          <p class="error" data-error></p>
        </form>
        <BulkBar kind="issue" options={issueOptions(null)} reason />
      </div>
    ) : (
      <Empty icon="issue" title={`No ${status} issues`} />
    )}
  </Layout>
);

type DetailProps = { issue: IssueView; tab: IssueTab; seed: TraceView | null; projectTraces: number; judges: Judge[]; shell: Shell };

const detailTabs = (issue: IssueView, tab: IssueTab): Tab[] => [
  { href: urls.issue(issue.id), label: 'Overview', current: tab === 'overview' },
  { href: urls.issue(issue.id, 'traces'), label: 'Traces', count: issue.occurrences, current: tab === 'traces' },
  { href: urls.issue(issue.id, 'backtest'), label: 'Backtest', count: issue.backtest?.fails, current: tab === 'backtest' },
];

const Stat = ({ icon, label, children }: { icon: 'trace' | 'issue' | 'flag' | 'score' | 'fail'; label: string; children: Child }) => (
  <div class="card stat">
    <span class="label"><Icon name={icon} size="sm" />{label}</span>
    {children}
  </div>
);

const ActionCard = ({ issue }: { issue: IssueView }) => {
  const b = issue.backtest;
  return (
    <div class="card action-card">
      <span class="avatar">{b ? initials(b.judge) : <Icon name="judge" size="sm" />}</span>
      <div class="grow stack" style="--gap: 0">
        <span class="strong">{b ? b.judge : 'No judge'}</span>
        {b ? <span class="muted t-meta">{b.version === null ? 'no active version' : `v${b.version} · ${b.fails} of ${b.scored} fail`}</span> : null}
      </div>
      <a class="btn btn-primary" href={urls.issue(issue.id, 'backtest')}>
        <Icon name="backtest" />
        {b ? `Backtest with ${b.judge}` : 'Link a judge'}
      </a>
    </div>
  );
};

const Overview = ({ issue, seed, projectTraces }: Pick<DetailProps, 'issue' | 'seed' | 'projectTraces'>) => {
  const seedTurn = issue.occurrence_list.find((o) => o.trace_id === seed?.id)?.turn ?? undefined;
  return (
    <div class="stack" style="--gap: var(--space-32)">
      <div class="stats" style="margin: 0">
        <Stat icon="trace" label="Occurrences"><span class="t-stat num">{issue.occurrences}</span></Stat>
        <Stat icon="issue" label="Traces affected"><span class="t-stat num">{projectTraces ? pct(issue.traces / projectTraces) : '–'}</span></Stat>
        <Stat icon="flag" label="Severity"><span><span class={`${severityPill[issue.severity]} pill-lg`}>{issue.severity}</span></span></Stat>
      </div>
      {issue.description ? (
        <div class="block">
          <span class="block-label">Description</span>
          <p class="note">{issue.description}</p>
        </div>
      ) : null}
      {seed ? (
        <div class="block">
          <span class="block-label"><Icon name="trace" size="sm" />Seed trace · <a class="link mono" href={urls.trace(seed.id, seedTurn)}>{short(seed.id)}</a></span>
          {seed.messages?.length ? <Turns messages={seed.messages} scores={seed.scores} focus={seedTurn} /> : <Values value={seed.output} />}
        </div>
      ) : null}
      <ActionCard issue={issue} />
    </div>
  );
};

const OccurrenceRow = ({ o }: { o: OccurrenceView }) => (
  <a class="list-row" href={o.url}>
    <span class="avatar avatar-sm"><Icon name="trace" size="sm" /></span>
    <span class="mono strong">{short(o.trace_id)}</span>
    <span class="meta">{turnLabel(o.turn)}</span>
    <span class="grow muted">{o.evidence ?? ''}</span>
    <span class="meta">{o.created_by}</span>
    <span class="meta num" title={o.created_at}>{ago(o.created_at)}</span>
  </a>
);

const Occurrences = ({ issue }: { issue: IssueView }) =>
  issue.occurrence_list.length ? (
    <div class="card card-flush">{issue.occurrence_list.map((o) => <OccurrenceRow o={o} />)}</div>
  ) : (
    <Empty icon="trace" title="No occurrences" />
  );

const JudgeLink = ({ issue, judges }: { issue: IssueView; judges: Judge[] }) => (
  <form class="link-judge cluster" data-link-judge style="--gap: var(--space-8)">
    <select class="input" name="judge_name" aria-label="Judge">
      <option value="">No judge</option>
      {judges.map((j) => <option value={j.name} selected={j.name === issue.judge_name}>{j.name}</option>)}
    </select>
    <button class="btn btn-secondary" type="submit"><Icon name="judge" />Link</button>
    <a class="btn btn-ghost" href={urls.judges()}><Icon name="open" />Judges</a>
    <p class="error" data-error></p>
  </form>
);

const BacktestTab = ({ issue, judges }: { issue: IssueView; judges: Judge[] }) => {
  const b = issue.backtest;
  if (!b) return (
    <div class="stack" style="--gap: var(--space-32)">
      <Empty icon="backtest" title="No judge linked" action={<JudgeLink issue={issue} judges={judges} />} />
    </div>
  );
  return (
    <div class="stack" style="--gap: var(--space-32)">
      <div class="stats" style="margin: 0">
        <Stat icon="score" label="Traces scored"><span class="t-stat num">{b.scored}</span></Stat>
        <Stat icon="fail" label="Fails"><span class="t-stat num">{b.fails}</span></Stat>
        <Stat icon="issue" label="Fail rate"><span class="t-stat num">{b.fail_rate === null ? '–' : pct(b.fail_rate)}</span></Stat>
      </div>
      <div class="block">
        <span class="block-label"><Icon name="run" size="sm" />Run</span>
        <div class="command">
          <pre class="code">{b.command}</pre>
          <button class="btn btn-secondary" type="button" data-copy={b.command}><Icon name="copy" size="sm" /><span>Copy</span></button>
        </div>
      </div>
      <div class="block">
        <span class="block-label"><Icon name="fail" size="sm" />Failing traces · <a class="link" href={b.url}>{b.judge}{b.version === null ? '' : ` v${b.version}`}</a></span>
        {b.failing.length ? (
          <div class="card card-flush">
            {b.failing.map((f) => (
              <a class="list-row" href={f.url}>
                <span class="avatar avatar-sm"><Icon name="fail" size="sm" /></span>
                <span class="mono strong grow">{short(f.trace_id)}</span>
                <span class="meta">{f.turns.length ? f.turns.map((t) => `turn ${t}`).join(' · ') : 'whole trace'}</span>
              </a>
            ))}
          </div>
        ) : (
          <Empty icon="pass" title="No fails" />
        )}
      </div>
      <JudgeLink issue={issue} judges={judges} />
    </div>
  );
};

const Properties = ({ issue }: { issue: IssueView }) => (
  <aside class="aside" aria-label="Issue" data-issue={issue.id}>
    <section class="stack" style="--gap: var(--space-8)">
      <h2>Status</h2>
      <StatusMenu kind="issue" id={issue.id} current={issue.status} options={issueOptions(issue.status)} variant="field" reload />
      <form class="dismiss-form stack" data-dismiss-form hidden={issue.status !== 'dismissed' || undefined} style="--gap: var(--space-8)">
        <input class="input" name="reason" placeholder="Reason" aria-label="Reason" value={issue.dismissed_reason ?? ''} required />
        <button class="btn btn-fail" type="submit"><Icon name="dismiss" size="sm" />{issue.status === 'dismissed' ? 'Save reason' : 'Dismiss'}</button>
      </form>
      <p class="error" data-error></p>
    </section>
    <section>
      <h2>Properties</h2>
      <dl>
        <div class="prop">
          <dt>Severity</dt>
          <dd>
            <select class="input" name="severity" aria-label="Severity" data-patch="severity">
              {(['low', 'medium', 'high'] as const).map((s) => <option value={s} selected={s === issue.severity}>{s}</option>)}
            </select>
          </dd>
        </div>
        <div class="prop"><dt>Judge</dt><dd><PropValue icon="judge">{issue.judge_name ? <a class="link" href={urls.judge(issue.judge_name)}>{issue.judge_name}</a> : <a class="link" href={urls.issue(issue.id, 'backtest')}>Link</a>}</PropValue></dd></div>
        <div class="prop"><dt>Seed trace</dt><dd><PropValue icon="trace">{issue.seed_trace_id ? <a class="link mono" href={urls.trace(issue.seed_trace_id)}>{short(issue.seed_trace_id)}</a> : '–'}</PropValue></dd></div>
        <div class="prop"><dt>Project</dt><dd><PropValue icon="dataset">{issue.project}</PropValue></dd></div>
        <div class="prop"><dt>Created by</dt><dd><PropValue icon="human">{issue.created_by}</PropValue></dd></div>
        <div class="prop"><dt>Created</dt><dd><PropValue icon="time" class="num" title={issue.created_at}>{ago(issue.created_at)}</PropValue></dd></div>
        <div class="prop"><dt>Updated</dt><dd><PropValue icon="time" class="num" title={issue.updated_at}>{ago(issue.updated_at)}</PropValue></dd></div>
      </dl>
    </section>
    <section class="stack" style="--gap: var(--space-8)">
      <h2>Recent occurrences</h2>
      {issue.occurrence_list.length ? (
        <div class="occ-list">
          {issue.occurrence_list.slice(0, 6).map((o) => (
            <a class="list-row" href={o.url}>
              <span class="avatar avatar-sm"><Icon name="trace" size="sm" /></span>
              <span class="grow mono">{short(o.trace_id)}</span>
              <span class="meta">{turnLabel(o.turn)}</span>
            </a>
          ))}
        </div>
      ) : (
        <p class="muted">None</p>
      )}
    </section>
  </aside>
);

export const IssuePage = ({ issue, tab, seed, projectTraces, judges, shell }: DetailProps) => (
  <Layout
    title={issue.title}
    meta={`${statusLabel[issue.status]} · ${issue.created_by} · ${ago(issue.created_at)}`}
    section="issues"
    shell={shell}
    tabs={detailTabs(issue, tab)}
    crumbs={[[urls.issues({ status: issue.status === 'open' ? undefined : issue.status }), 'Issues']]}
    script="issue"
    aside={<Properties issue={issue} />}
  >
    {issue.status === 'dismissed' && issue.dismissed_reason ? (
      <p class="dismissed-note"><span class="pill"><Icon name="dismiss" size="sm" />Dismissed</span> {issue.dismissed_reason}</p>
    ) : null}
    {tab === 'overview' ? <Overview issue={issue} seed={seed} projectTraces={projectTraces} /> : null}
    {tab === 'traces' ? <Occurrences issue={issue} /> : null}
    {tab === 'backtest' ? <BacktestTab issue={issue} judges={judges} /> : null}
  </Layout>
);
