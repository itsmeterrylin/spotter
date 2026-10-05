import type { IssueRow } from '../db/repos/issue.ts';
import type { Run } from '../db/repos/run.ts';
import type { Score } from '../db/repos/score.ts';
import type { Message, TraceEvent } from '../db/types.ts';
import type { TraceView } from '../services/traces.ts';
import { parseMaybeJson } from '../db/json.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict, Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import { ago, Icon, JsonView, pct, PropValue, short, State, summarize, Values, VerdictPill } from './ui.tsx';

const scoreIcon = (s: Score): 'pass' | 'fail' | 'score' => (s.value === 1 ? 'pass' : s.value === 0 ? 'fail' : 'score');

export const Turn = ({ message: m, scores, focus, flag }: { message: Message; scores: Score[]; focus?: boolean; flag?: boolean }) => (
  <div class="turn" id={`turn-${m.turn}`} data-focus={focus ? '1' : undefined}>
    <span class="who">
      {m.role} · {m.turn}
      {flag ? (
        <button class="turn-flag" type="button" data-new-issue-open data-turn={m.turn} aria-label={`New issue at turn ${m.turn}`} title={`New issue at turn ${m.turn}`}>
          <Icon name="flag" size="sm" />
        </button>
      ) : null}
    </span>
    <span>
      {typeof parseMaybeJson(m.content) === 'string' ? m.content : <JsonView value={parseMaybeJson(m.content)} />}
      {scores.filter((s) => s.turn === m.turn).map((s) => (
        <>
          <br />
          <span class={`pill pill-${s.value === 1 ? 'pass' : 'fail'}`}><Icon name={s.value === 1 ? 'pass' : 'fail'} size="sm" />{s.name} · {s.source}</span>
        </>
      ))}
    </span>
  </div>
);

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

export const TraceBody = ({ trace, verdict, turn }: { trace: TraceView; verdict: HumanVerdict | null; turn?: number }) => (
  <div class="review">
      <NewIssueForm trace={trace} turn={turn} />
      <div class="block">
        <span class="block-label"><Icon name="trace" size="sm" />{trace.messages?.length ? 'Conversation' : 'Input'}</span>
        {trace.messages?.length ? <Turns messages={trace.messages} scores={trace.scores} focus={turn} flags /> : <JsonView value={trace.input} />}
      </div>
      <div class="block">
        <span class="block-label"><Icon name="score" size="sm" />Output</span>
        <Values value={trace.output} />
      </div>
      <div class="block">
        <span class="block-label"><Icon name="flag" size="sm" />Expected</span>
        <Values value={trace.expected} />
      </div>
      <div class="block">
        <span class="block-label"><Icon name="judge" size="sm" />Scores</span>
        <Scores scores={trace.scores} verdict={verdict} />
      </div>
      {trace.events?.length ? (
        <div class="block">
          <span class="block-label"><Icon name="time" size="sm" />Events</span>
          <Events events={trace.events} />
        </div>
      ) : null}
  </div>
);

type Props = { trace: TraceView; run: Run | null; verdict: HumanVerdict | null; turn?: number; issues: IssueRow[]; shell: Shell };

const TraceAside = ({ trace, run, issues }: Pick<Props, 'trace' | 'run' | 'issues'>) => (
  <aside class="aside" aria-label="Trace">
    <section>
      <h2>Properties</h2>
      <dl>
        <div class="prop"><dt>Run</dt><dd><PropValue icon="run">{run ? <a class="link" href={urls.run(run.id)}>{run.name}</a> : '–'}</PropValue></dd></div>
        <div class="prop"><dt>Item</dt><dd><PropValue icon="dataset" class="mono">{trace.dataset_item_id ? short(trace.dataset_item_id) : '–'}</PropValue></dd></div>
        <div class="prop"><dt>Turns</dt><dd><PropValue icon="score" class="num">{trace.messages?.length ?? 0}</PropValue></dd></div>
        <div class="prop"><dt>Start</dt><dd><PropValue icon="time" class="num" title={trace.start}>{ago(trace.start)}</PropValue></dd></div>
      </dl>
    </section>
    <section class="stack" style="--gap: var(--space-8)">
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
        <p class="muted">None</p>
      )}
    </section>
  </aside>
);

export const TracePage = ({ trace, run, verdict, turn, issues, shell }: Props) => (
  <Layout
    title={short(trace.id)}
    section="traces"
    shell={shell}
    crumbs={run ? [[urls.runs(run.dataset_id), 'Runs'], [urls.run(run.id), run.name]] : [[urls.traces(), 'Traces']]}
    action={
      <>
        <a class="btn btn-secondary" href={urls.reviewTrace(trace.id, { run: run?.id })}><Icon name="human" />{verdict ? 'Change verdict' : 'Label'}</a>
        <NewIssueButton />
      </>
    }
    script="trace"
    aside={<TraceAside trace={trace} run={run} issues={issues} />}
  >
    <TraceBody trace={trace} verdict={verdict} turn={turn} />
  </Layout>
);

export const TracePane = ({ trace, run, verdict, closeHref }: { trace: TraceView; run: Run | null; verdict: HumanVerdict | null; closeHref: string }) => (
  <div class="pane-inner" data-trace={trace.id}>
    <div class="pane-head">
      <div class="stack" style="--gap: 2px">
        <a class="link strong mono" href={urls.trace(trace.id)}>{short(trace.id)}</a>
        {run ? <a class="link t-meta" href={urls.run(run.id)}>{run.name}</a> : null}
      </div>
      <div class="cluster" style="--gap: var(--space-8)">
        <NewIssueButton compact />
        <a class="btn btn-secondary" href={urls.reviewTrace(trace.id, { run: run?.id })}><Icon name="human" size="sm" />{verdict ? 'Change' : 'Label'}</a>
        <a class="btn btn-secondary" href={urls.trace(trace.id)} aria-label="Open trace page"><Icon name="open" size="sm" />Open</a>
        <a class="btn btn-ghost btn-icon" href={closeHref} data-pane-close aria-label="Close"><Icon name="fail" /></a>
      </div>
    </div>
    <TraceBody trace={trace} verdict={verdict} />
  </div>
);
