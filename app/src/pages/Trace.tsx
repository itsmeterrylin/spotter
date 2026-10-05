import type { Child } from 'hono/jsx';
import type { IssueRow } from '../db/repos/issue.ts';
import type { Run } from '../db/repos/run.ts';
import type { Score } from '../db/repos/score.ts';
import type { Message, TraceEvent } from '../db/types.ts';
import type { TraceView } from '../services/traces.ts';
import { parseMaybeJson } from '../db/json.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict, Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import { Icon, IconButton, JsonView, pct, Prop, short, since, State, summarize, Values, VerdictPill } from './ui.tsx';

const scoreIcon = (s: Score): 'pass' | 'fail' | 'score' => (s.value === 1 ? 'pass' : s.value === 0 ? 'fail' : 'score');

export const Turn = ({ message: m, scores, focus, flag }: { message: Message; scores: Score[]; focus?: boolean; flag?: boolean }) => {
  const turnScores = scores.filter((s) => s.turn === m.turn);
  const content = parseMaybeJson(m.content);
  return (
    <div class="turn" id={`turn-${m.turn}`} data-focus={focus ? '1' : undefined}>
      <div class="who">
        <span>{m.role} · {m.turn}</span>
        {flag ? (
          <button class="turn-flag" type="button" data-new-issue-open data-turn={m.turn} aria-label={`New issue at turn ${m.turn}`} title={`New issue at turn ${m.turn}`}>
            <Icon name="flag" size="sm" />
          </button>
        ) : null}
      </div>
      <div class="turn-body">{typeof content === 'string' ? m.content : <JsonView value={content} />}</div>
      {turnScores.length ? (
        <div class="turn-scores">
          {turnScores.map((s) => (
            <span class={`pill pill-${s.value === 1 ? 'pass' : 'fail'}`}><Icon name={s.value === 1 ? 'pass' : 'fail'} size="sm" />{s.name} · {s.source}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const Turns = ({ messages, scores, focus, flags }: { messages: Message[]; scores: Score[]; focus?: number; flags?: boolean }) => (
  <div class="transcript">
    {messages.map((m) => <Turn message={m} scores={scores} focus={m.turn === focus} flag={flags} />)}
  </div>
);

const NewIssueForm = ({ trace, turn }: { trace: TraceView; turn?: number }) => {
  const turns = [...new Set((trace.messages ?? []).map((m) => m.turn))];
  const id = (name: string): string => `new-issue-${name}-${trace.id}`;
  return (
    <form class="card new-issue stack" data-new-issue data-project={trace.project_id} data-trace={trace.id} hidden>
      <div class="field">
        <label for={id('title')}>Title</label>
        <input class="input" id={id('title')} name="title" required autocomplete="off" />
      </div>
      <div class="new-issue-row">
        <div class="field">
          <label for={id('severity')}>Severity</label>
          <select class="input" id={id('severity')} name="severity">
            {(['low', 'medium', 'high'] as const).map((s) => <option value={s} selected={s === 'medium'}>{s}</option>)}
          </select>
        </div>
        <div class="field">
          <label for={id('turn')}>Turn</label>
          <select class="input" id={id('turn')} name="turn">
            <option value="">Whole trace</option>
            {turns.map((t) => <option value={String(t)} selected={t === turn}>{`Turn ${t}`}</option>)}
          </select>
        </div>
      </div>
      <div class="cluster" style="--gap: var(--space-8)">
        <button class="btn btn-primary" type="submit"><Icon name="issue" />File issue</button>
        <button class="btn btn-ghost" type="button" data-new-issue-cancel>Cancel</button>
        <span class="cluster" style="--gap: var(--space-8)" data-new-issue-result></span>
      </div>
      <p class="error" data-error></p>
    </form>
  );
};

const NewIssueButton = ({ compact }: { compact?: boolean }) => (
  <button class="btn btn-primary" type="button" data-new-issue-open><Icon name="issue" size={compact ? 'sm' : 'md'} />New issue</button>
);

const Scores = ({ scores, verdict }: { scores: Score[]; verdict: HumanVerdict | null }) => (
  <div class="card card-flush">
    {scores.filter((s) => s.source !== 'human' && s.turn === null).map((s) => (
      <div class="row">
        <Icon name={scoreIcon(s)} />
        <div class="grow">{s.name} <span class="muted">· {s.source}</span></div>
        <span class="num strong">{pct(s.value)}</span>
      </div>
    ))}
    {verdict ? (
      <div class="row">
        <Icon name="human" />
        <div class="grow">
          {verdict.name} <span class="muted">· human{verdict.note ? ` · ${verdict.note}` : ''}</span>
        </div>
        <VerdictPill verdict={verdict.verdict} />
      </div>
    ) : null}
  </div>
);

const Events = ({ events }: { events: TraceEvent[] }) => (
  <div class="card card-flush">
    {events.map((e) => (
      <div class="row">
        <Icon name="time" />
        <div class="grow">{e.name} <span class="muted num">· {e.at}</span></div>
        {e.data === undefined ? null : <span class="mono t-meta">{summarize(e.data)}</span>}
      </div>
    ))}
  </div>
);

const tokenCount = (m: TraceView['metrics']): number | null => {
  if (m?.prompt_tokens === undefined && m?.completion_tokens === undefined) return null;
  return (m.prompt_tokens ?? 0) + (m.completion_tokens ?? 0);
};

const compact = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n));

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

const verdictIcon = { pass: 'pass', fail: 'fail', defer: 'defer' } as const;

const TraceProperties = ({ trace, run, verdict }: { trace: TraceView; run: Run | null; verdict: HumanVerdict | null }) => {
  const tokens = tokenCount(trace.metrics);
  const errors = trace.metrics?.errors;
  const turns = trace.messages?.length ?? 0;
  return (
    <section>
      <h2>Properties</h2>
      <dl>
        <Prop name="Verdict" icon={verdict ? verdictIcon[verdict.verdict] : 'time'} class={verdict ? `verdict-${verdict.verdict}` : undefined} empty="Set verdict">
          {verdict ? verdict.verdict : null}
        </Prop>
        <Prop name="Run" icon="run" empty="No run">{run ? <a class="link" href={urls.run(run.id)}>{run.name}</a> : null}</Prop>
        <Prop name="Dataset item" icon="dataset" class="mono" empty="No dataset item">{trace.dataset_item_id ? short(trace.dataset_item_id) : null}</Prop>
        <Prop name="Turns" icon="score" class="num" empty="No turns">{turns ? plural(turns, 'turn') : null}</Prop>
        <Prop name="Start" icon="time" class="num" hint={trace.start}>{since('Started', trace.start)}</Prop>
        {tokens === null ? null : <Prop name="Tokens" icon="tokens" class="num">{`${compact(tokens)} tokens`}</Prop>}
        {typeof errors === 'number' ? <Prop name="Errors" icon="fail" class="num">{plural(errors, 'error')}</Prop> : null}
      </dl>
    </section>
  );
};

const isEmptyValue = (v: unknown): boolean => v === null || v === undefined;

export const TraceBody = ({ trace, verdict, turn, properties }: { trace: TraceView; verdict: HumanVerdict | null; turn?: number; properties?: Child }) => {
  const hasScores = trace.scores.some((s) => s.source !== 'human' && s.turn === null) || verdict !== null;
  return (
    <div class="review">
      <NewIssueForm trace={trace} turn={turn} />
      {properties}
      <div class="block">
        <span class="block-label">{trace.messages?.length ? 'Conversation' : 'Input'}</span>
        {trace.messages?.length ? <Turns messages={trace.messages} scores={trace.scores} focus={turn} flags /> : <JsonView value={trace.input} />}
      </div>
      {isEmptyValue(trace.output) ? null : (
        <div class="block">
          <span class="block-label">Output</span>
          <Values value={trace.output} />
        </div>
      )}
      {isEmptyValue(trace.expected) ? null : (
        <div class="block">
          <span class="block-label">Expected</span>
          <Values value={trace.expected} />
        </div>
      )}
      {hasScores ? (
        <div class="block">
          <span class="block-label">Scores</span>
          <Scores scores={trace.scores} verdict={verdict} />
        </div>
      ) : null}
      {trace.events?.length ? (
        <div class="block">
          <span class="block-label">Events</span>
          <Events events={trace.events} />
        </div>
      ) : null}
    </div>
  );
};

type Props = { trace: TraceView; run: Run | null; verdict: HumanVerdict | null; turn?: number; issues: IssueRow[]; shell: Shell };

const TraceAside = ({ trace, run, verdict, issues }: Pick<Props, 'trace' | 'run' | 'verdict' | 'issues'>) => (
  <aside class="aside" aria-label="Trace">
    <TraceProperties trace={trace} run={run} verdict={verdict} />
    <section>
      <h2>Issues</h2>
      {issues.length ? (
        <div class="occ-list">
          {issues.map((i) => (
            <a class="list-row" href={urls.issue(i.id)}>
              <State status={i.status} />
              <span class="grow">{i.title}</span>
            </a>
          ))}
        </div>
      ) : (
        <dl><Prop name="Issues" icon="issue" empty="No issues" /></dl>
      )}
    </section>
  </aside>
);

export const TracePage = ({ trace, run, verdict, turn, issues, shell }: Props) => (
  <Layout
    title={short(trace.id)}
    heading
    section="traces"
    shell={shell}
    crumbs={run ? [[urls.runs(run.dataset_id), 'Runs'], [urls.run(run.id), run.name]] : [[urls.traces(), 'Traces']]}
    actions={
      <>
        <IconButton href={urls.reviewTrace(trace.id, { run: run?.id })} icon="human" label={verdict ? 'Change verdict' : 'Label'} />
        <button class="btn btn-icon" type="button" data-new-issue-open title="New issue" aria-label="New issue"><Icon name="issue" /></button>
      </>
    }
    script="trace"
    aside={<TraceAside trace={trace} run={run} verdict={verdict} issues={issues} />}
  >
    <TraceBody trace={trace} verdict={verdict} turn={turn} />
  </Layout>
);

export const TracePane = ({ trace, run, verdict, closeHref }: { trace: TraceView; run: Run | null; verdict: HumanVerdict | null; closeHref: string }) => (
  <div class="pane-inner" data-trace={trace.id}>
    <div class="pane-head">
      <div class="pane-id">
        <a class="pane-trace" href={urls.trace(trace.id)} title="Open trace page">{short(trace.id)}</a>
        {run ? <a class="pill pane-run" href={urls.run(run.id)} title={`Run ${run.name}`}>{run.name}</a> : null}
      </div>
      <div class="pane-actions">
        <NewIssueButton compact />
        <a class="btn btn-ghost btn-icon" href={urls.reviewTrace(trace.id, { run: run?.id })} title={verdict ? 'Change verdict' : 'Label'} aria-label={verdict ? 'Change verdict' : 'Label'}><Icon name="human" size="sm" /></a>
        <a class="btn btn-ghost btn-icon" href={urls.trace(trace.id)} title="Open" aria-label="Open trace page"><Icon name="open" size="sm" /></a>
        <a class="btn btn-ghost btn-icon" href={closeHref} data-pane-close title="Close" aria-label="Close"><Icon name="fail" size="sm" /></a>
      </div>
    </div>
    <TraceBody trace={trace} verdict={verdict} properties={<TraceProperties trace={trace} run={run} verdict={verdict} />} />
  </div>
);
