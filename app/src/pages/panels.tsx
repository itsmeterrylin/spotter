import type { Child } from 'hono/jsx';
import type { IssueRow } from '../db/repos/issue.ts';
import type { Run } from '../db/repos/run.ts';
import { labelTarget, shownRow, type VersionView } from '../services/judges.ts';
import type { TraceView } from '../services/traces.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict, RunCard } from './data.ts';
import type { PanelData, ReviewState } from './panelData.ts';
import { ActivateForm } from './judgeParts.tsx';
import { Delta, Icon, issueOptions, judgeOptions, pct, Prop, severityOptions, short, since, State, StatusMenu, type Verdict } from './ui.tsx';

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

const compact = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n));

const tokenCount = (m: TraceView['metrics']): number | null => {
  if (m?.prompt_tokens === undefined && m?.completion_tokens === undefined) return null;
  return (m.prompt_tokens ?? 0) + (m.completion_tokens ?? 0);
};

const seconds = (ms: number): string => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};

export const duration = (start: string, end: string | null): string | null => (end ? seconds(Date.parse(end) - Date.parse(start)) : null);

const Group = ({ title, children }: { title: string; children: Child }) => (
  <section>
    <h2>{title}</h2>
    <dl>{children}</dl>
  </section>
);

const A = ({ href, children }: { href: string; children: Child }) => <a class="link" href={href}>{children}</a>;

const Field = ({ name, children }: { name: string; children: Child }) => (
  <div class="prop">
    <dt class="sr">{name}</dt>
    <dd>{children}</dd>
  </div>
);

const verdictIcon = { pass: 'pass', fail: 'fail', defer: 'defer' } as const;

const verdictKeys: Array<[Verdict, string, string]> = [
  ['pass', 'Pass', '1'],
  ['fail', 'Fail', '2'],
  ['defer', 'Defer', 'D'],
];

type RowProps = { turn: number | null; verdict: Verdict | null; focus: boolean };

/** Pass, Fail, Defer for the whole trace or one turn. review.ts wires every `.verdict-row`. */
export const VerdictRow = ({ turn, verdict, focus }: RowProps) => (
  <div class={turn === null ? 'verdict-row' : 'verdict-row verdict-row-turn'} data-turn={turn ?? ''} data-verdict={verdict ?? ''} data-focus={focus ? '1' : undefined}>
    {verdictKeys.map(([v, label, key]) => (
      <button class={`btn btn-${v}`} type="button" data-verdict={v} aria-pressed={verdict === v ? 'true' : 'false'}>
        <Icon name={v} />{label}{turn === null ? <span class="kbd">{key}</span> : null}
      </button>
    ))}
  </div>
);

const Step = ({ href, name, label }: { href: string | null; name: 'previous' | 'next'; label: string }) =>
  href ? (
    <a class="btn btn-ghost btn-icon" href={href} aria-label={label} title={label} data-nav={name}><Icon name={name} size="sm" /></a>
  ) : (
    <span class="btn btn-ghost btn-icon" aria-disabled="true" aria-label={label}><Icon name={name} size="sm" /></span>
  );

const Queue = ({ review }: { review: ReviewState }) => (
  <div class="prop prop-queue">
    <dt class="sr">Queue</dt>
    <dd>
      <span class="propbtn num" title="Queue position">
        <Icon name="trace" />
        {review.index === null ? `${review.total} left` : `${review.index} of ${review.total}`}
      </span>
      <Step href={review.prev} name="previous" label="Previous" />
      <Step href={review.next} name="next" label="Next" />
    </dd>
  </div>
);

type TraceProps = { trace: TraceView; run: Run | null; verdict: HumanVerdict | null; issues: IssueRow[]; review?: ReviewState };

const TracePanel = ({ trace, run, verdict, issues, review }: TraceProps) => {
  const tokens = tokenCount(trace.metrics);
  const errors = trace.metrics?.errors;
  const turns = trace.messages?.length ?? 0;
  return (
    <>
      <section>
        <h2>Properties</h2>
        <dl>
          {review ? (
            <Field name="Verdict"><VerdictRow turn={null} verdict={verdict?.verdict ?? null} focus={review.focus} /></Field>
          ) : (
            <Prop name="Verdict" icon={verdict ? verdictIcon[verdict.verdict] : 'time'} class={verdict ? `verdict-${verdict.verdict}` : undefined} empty={<A href={urls.reviewTrace(trace.id, { run: run?.id })}>Set verdict</A>}>
              {verdict ? verdict.verdict : null}
            </Prop>
          )}
          {review ? <Queue review={review} /> : null}
          {review?.source ? <Prop name="Queue source" icon="human">{review.source}</Prop> : null}
          <Prop name="Turns" icon="score" class="num" empty="No turns">{turns ? plural(turns, 'turn') : null}</Prop>
          <Prop name="Start" icon="time" class="num" hint={trace.start}>{since('Started', trace.start)}</Prop>
          {tokens === null ? null : <Prop name="Tokens" icon="tokens" class="num">{`${compact(tokens)} tokens`}</Prop>}
          {typeof errors === 'number' ? <Prop name="Errors" icon="fail" class="num">{plural(errors, 'error')}</Prop> : null}
        </dl>
      </section>
      <section>
        <h2>Relations</h2>
        <dl>
          <Prop name="Run" icon="run" empty="No run">{run ? <A href={urls.run(run.id)}>{run.name}</A> : null}</Prop>
          <Prop name="Dataset item" icon="dataset" class="mono" empty="No dataset item">{trace.dataset_item_id ? short(trace.dataset_item_id) : null}</Prop>
          {issues.length ? (
            issues.map((i) => (
              <Prop name="Issue" icon="issue"><State status={i.status} /><A href={urls.issue(i.id)}>{i.title}</A></Prop>
            ))
          ) : (
            <Prop name="Issues" icon="issue" empty="No issues" />
          )}
        </dl>
      </section>
    </>
  );
};

const IssuePanel = ({ data: { issue, projectTraces } }: { data: Extract<PanelData, { kind: 'issue' }> }) => (
  <div data-issue={issue.id} class="panel-body">
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
        <Field name="Severity"><StatusMenu kind="severity" id={issue.id} current={issue.severity} options={severityOptions} variant="field" reload noun="severity" /></Field>
        <Prop name="Occurrences" icon="trace" class="num">{plural(issue.occurrences, 'occurrence')}</Prop>
        <Prop name="Traces affected" icon="issue" class="num" empty="No traces">{projectTraces ? `${pct(issue.traces / projectTraces)} of traces` : null}</Prop>
        <Prop name="Project" icon="dataset">{issue.project}</Prop>
        <Prop name="Created by" icon="human">{`Created by ${issue.created_by}`}</Prop>
        <Prop name="Created" icon="time" class="num" hint={issue.created_at}>{since('Created', issue.created_at)}</Prop>
        <Prop name="Updated" icon="time" class="num" hint={issue.updated_at}>{since('Updated', issue.updated_at)}</Prop>
      </dl>
    </section>
    <Group title="Relations">
      <Prop name="Judge" icon="judge" empty={<A href={urls.issue(issue.id, 'backtest')}>Link judge</A>}>
        {issue.judge_name ? <A href={urls.judge(issue.judge_name)}>{issue.judge_name}</A> : null}
      </Prop>
      <Prop name="Seed trace" icon="trace" class="mono" empty="No seed trace">
        {issue.seed_trace_id ? <A href={urls.trace(issue.seed_trace_id)}>{short(issue.seed_trace_id)}</A> : null}
      </Prop>
      <Prop name="Traces" icon="trace" empty="No occurrences">
        {issue.occurrences ? <A href={urls.issue(issue.id, 'traces')}>{plural(issue.occurrences, 'occurrence')}</A> : null}
      </Prop>
    </Group>
  </div>
);

const versionOption = (v: VersionView) => (
  <option value={String(v.number)} selected={v.active}>{`v${v.number}${v.calibrated ? ' · calibrated' : ''}`}</option>
);

const JudgePanel = ({ data: { judge, disagreements, openIssues } }: { data: Extract<PanelData, { kind: 'judge' }> }) => {
  const active = judge.versions.find((v) => v.active);
  const row = active ? shownRow(active.calibration) : null;
  return (
    <div data-judge={judge.name} class="panel-body">
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
          <Prop name="Calibration" icon={judge.status === 'calibrated' ? 'pass' : 'time'} class={judge.status === 'calibrated' ? 'verdict-pass' : undefined}>
            {judge.status === 'calibrated' ? 'Calibrated' : judge.status === 'pending' ? 'Pending' : 'Needs labels'}
          </Prop>
          <Prop name="Labels collected" icon="score" class="num">{`${judge.labels}/${labelTarget} labels`}</Prop>
          <Prop name="TPR" icon="up" class="num" empty="No TPR yet">{row ? `TPR ${pct(row.tpr)}` : null}</Prop>
          <Prop name="TNR" icon="down" class="num" empty="No TNR yet">{row ? `TNR ${pct(row.tnr)}` : null}</Prop>
          <Prop name="Scope" icon="settings" empty="No active version">{active ? `${active.scope} scope` : null}</Prop>
          <Prop name="Model" icon="judge" empty="No active version">{active?.model ?? null}</Prop>
          <Prop name="Created" icon="time" class="num" hint={judge.created_at}>{since('Created', judge.created_at)}</Prop>
        </dl>
        <p class="error" data-error></p>
      </section>
      <Group title="Relations">
        <Prop name="Versions" icon="backtest"><A href={urls.judge(judge.name, 'versions')}>{plural(judge.versions.length, 'version')}</A></Prop>
        <Prop name="Disagreements" icon="flag"><A href={urls.judge(judge.name, 'disagreements')}>{plural(disagreements, 'disagreement')}</A></Prop>
        <Prop name="Open issues" icon="issue"><A href={urls.judge(judge.name, 'issues')}>{plural(openIssues, 'open issue')}</A></Prop>
      </Group>
    </div>
  );
};

const VersionPanel = ({ data: { judge, version: v, disagreements } }: { data: Extract<PanelData, { kind: 'version' }> }) => {
  const parent = v.parent_id ? judge.versions.find((x) => x.id === v.parent_id) : undefined;
  const row = shownRow(v.calibration);
  return (
    <div class="panel-body">
      <section class="stack" style="--gap: var(--space-8)">
        <h2>Status</h2>
        <dl>
          <Prop name="Status" icon={v.active ? 'stateLive' : 'stateDraft'} class={v.active ? 'verdict-pass' : undefined}>{v.active ? 'Active' : 'Not active'}</Prop>
        </dl>
        {!v.active && v.calibrated ? <ActivateForm name={judge.name} number={v.number} /> : null}
      </section>
      <section>
        <h2>Properties</h2>
        <dl>
          <Prop name="Version" icon="backtest" class="num">{`Version ${v.number}`}</Prop>
          <Prop name="Calibration" icon={v.calibrated ? 'pass' : 'time'} class={v.calibrated ? 'verdict-pass' : undefined}>
            {v.calibrated ? 'Calibrated' : v.calibration.length ? 'Pending' : 'Needs labels'}
          </Prop>
          <Prop name="TPR and TNR" icon="score" class="num" empty="No rates yet">{row ? `TPR ${pct(row.tpr)} · TNR ${pct(row.tnr)}` : null}</Prop>
          <Prop name="Scope" icon="settings">{`${v.scope} scope`}</Prop>
          <Prop name="Model" icon="judge">{v.model}</Prop>
          <Prop name="Created by" icon="human">{`Created by ${v.created_by}`}</Prop>
          <Prop name="Created" icon="time" class="num" hint={v.created_at}>{since('Created', v.created_at)}</Prop>
          <Prop name="Content hash" icon="copy" class="mono muted" hint={v.content_hash}>{short(v.content_hash)}</Prop>
        </dl>
      </section>
      <Group title="Relations">
        <Prop name="Judge" icon="judge"><A href={judge.url}>{judge.name}</A></Prop>
        <Prop name="Parent version" icon="backtest" empty="No parent version">{parent ? <A href={parent.url}>{`v${parent.number}`}</A> : null}</Prop>
        <Prop name="Calibration report" icon="score" empty="No calibration yet">
          {v.calibration.length ? <A href={`${v.url}#calibration`}>{plural(v.calibration.length, 'report')}</A> : null}
        </Prop>
        <Prop name="Disagreements" icon="flag"><A href={urls.judgeDisagreements(judge.name, v.number)}>{plural(disagreements, 'disagreement')}</A></Prop>
      </Group>
    </div>
  );
};

const RunPanel = ({ data: { card, traces } }: { data: Extract<PanelData, { kind: 'run' }> }) => {
  const { run, dataset, baseline, scores, primary, unlabeled, regressed } = card;
  const length = duration(run.started_at, run.ended_at);
  return (
    <div class="panel-body">
      <section>
        <h2>Properties</h2>
        <dl>
          <Prop name="Name" icon="run">{run.name}</Prop>
          <Prop name="Status" icon={run.ended_at ? 'pass' : 'time'}>{run.ended_at ? 'Done' : 'Running'}</Prop>
          <Prop name="Items" icon="dataset" class="num">{plural(run.item_count || traces, 'item')}</Prop>
          <Prop name="Started" icon="time" class="num" hint={run.started_at}>{since('Started', run.started_at)}</Prop>
          <Prop name="Ended" icon="time" class="num" empty="Not ended" hint={run.ended_at ?? undefined}>{length ? `Ran ${length}` : null}</Prop>
          <Prop name="Items hash" icon="copy" class="mono muted" empty="No items hash" hint={run.items_hash ?? undefined}>{run.items_hash ? short(run.items_hash) : null}</Prop>
          {Object.entries(scores).map(([name, s]) => (
            <Prop name={name} icon="score" class={name === primary ? 'num strong' : 'num'}>
              <a class="link" href={urls.run(run.id, name)}>{`${name} ${pct(s.mean)}`}</a>
              <Delta value={s.diff} />
            </Prop>
          ))}
        </dl>
      </section>
      <Group title="Relations">
        <Prop name="Dataset" icon="dataset" empty="No dataset">{dataset ? <A href={urls.dataset(dataset.id)}>{dataset.name}</A> : null}</Prop>
        <Prop name="Compare" icon="compare" empty="No previous run">
          {baseline ? <A href={urls.compare(run.dataset_id, [baseline.id, run.id], 'changes')}>{`Compare with ${baseline.name}${baseline ? ` · ${plural(regressed.length, 'regression')}` : ''}`}</A> : null}
        </Prop>
        <Prop name="Traces" icon="trace" empty="No traces">{traces ? <A href={urls.traces({ run: run.id })}>{plural(traces, 'trace')}</A> : null}</Prop>
        {unlabeled ? <Prop name="Unlabeled" icon="human"><A href={urls.review({ run: run.id, filter: 'unlabeled' })}>{`Review ${unlabeled} unlabeled`}</A></Prop> : null}
      </Group>
    </div>
  );
};

const DatasetPanel = ({ data: { dataset, items, cards, sourceTraces } }: { data: Extract<PanelData, { kind: 'dataset' }> }) => {
  const [newest, previous] = cards;
  return (
    <div class="panel-body">
      <section>
        <h2>Properties</h2>
        <dl>
          <Prop name="Name" icon="dataset">{dataset.name}</Prop>
          <Prop name="Purpose" icon="flag">{dataset.purpose}</Prop>
          <Prop name="Description" icon="menu" empty="No description">{dataset.description}</Prop>
          <Prop name="Items" icon="trace" class="num">{plural(items, 'item')}</Prop>
          <Prop name="Created" icon="time" class="num" hint={dataset.created_at}>{since('Created', dataset.created_at)}</Prop>
        </dl>
      </section>
      <Group title="Relations">
        <Prop name="Runs" icon="run" empty="No runs yet">{cards.length ? <A href={urls.runs(dataset.id)}>{plural(cards.length, 'run')}</A> : null}</Prop>
        {newest && previous ? (
          <Prop name="Compare" icon="compare"><A href={urls.compare(dataset.id, [previous.run.id, newest.run.id], 'changes')}>Compare latest runs</A></Prop>
        ) : null}
        <Prop name="Source traces" icon="trace" class="num" empty="No source traces">{sourceTraces ? plural(sourceTraces, 'source trace') : null}</Prop>
      </Group>
    </div>
  );
};

const ItemPanel = ({ data: { dataset, item } }: { data: Extract<PanelData, { kind: 'item' }> }) => (
  <div class="panel-body">
    <section>
      <h2>Properties</h2>
      <dl>
        <Prop name="Id" icon="dataset" class="mono" hint={item.id}>{short(item.id)}</Prop>
        <Prop name="Tags" icon="flag" empty="No tags">{item.tags?.length ? item.tags.join(', ') : null}</Prop>
        <Prop name="Created" icon="time" class="num" hint={item.created_at}>{since('Created', item.created_at)}</Prop>
      </dl>
    </section>
    <Group title="Relations">
      <Prop name="Dataset" icon="dataset"><A href={urls.dataset(dataset.id)}>{dataset.name}</A></Prop>
      <Prop name="Source trace" icon="trace" class="mono" empty="No source trace">{item.source_trace_id ? <A href={urls.trace(item.source_trace_id)}>{short(item.source_trace_id)}</A> : null}</Prop>
    </Group>
  </div>
);

/** The right panel of one object. A detail page shows it in its aside and a peek shows it under its header. */
export const Panel = ({ data }: { data: PanelData }) => {
  switch (data.kind) {
    case 'issue': return <IssuePanel data={data} />;
    case 'trace': return <div class="panel-body"><TracePanel {...data} /></div>;
    case 'judge': return <JudgePanel data={data} />;
    case 'version': return <VersionPanel data={data} />;
    case 'run': return <RunPanel data={data} />;
    case 'dataset': return <DatasetPanel data={data} />;
    case 'item': return <ItemPanel data={data} />;
  }
};
