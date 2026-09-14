import type { Run } from '../db/repos/run.ts';
import type { Score } from '../db/repos/score.ts';
import type { Message, TraceEvent } from '../db/types.ts';
import type { TraceView } from '../services/traces.ts';
import { parseMaybeJson } from '../db/json.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict } from './data.ts';
import { Layout } from './Layout.tsx';
import { Icon, JsonView, pct, short, summarize, Values, VerdictPill } from './ui.tsx';

const scoreIcon = (s: Score): 'pass' | 'fail' | 'score' => (s.value === 1 ? 'pass' : s.value === 0 ? 'fail' : 'score');

export const Turn = ({ message: m, scores, focus }: { message: Message; scores: Score[]; focus?: boolean }) => (
  <div class="turn" id={`turn-${m.turn}`} data-focus={focus ? '1' : undefined}>
    <span class="who">{m.role} · {m.turn}</span>
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

export const Turns = ({ messages, scores, focus }: { messages: Message[]; scores: Score[]; focus?: number }) => (
  <div class="transcript">
    {messages.map((m) => <Turn message={m} scores={scores} focus={m.turn === focus} />)}
  </div>
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
        {e.data === undefined ? null : <span class="mono t-caption">{summarize(e.data)}</span>}
      </div>
    ))}
  </div>
);

export const TraceBody = ({ trace, verdict, turn }: { trace: TraceView; verdict: HumanVerdict | null; turn?: number }) => (
  <div class="review">
      <div class="block">
        <span class="block-label"><Icon name="trace" size="sm" />{trace.messages?.length ? 'Conversation' : 'Input'}</span>
        {trace.messages?.length ? <Turns messages={trace.messages} scores={trace.scores} focus={turn} /> : <JsonView value={trace.input} />}
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

type Props = { trace: TraceView; run: Run | null; verdict: HumanVerdict | null; turn?: number; unread: number };

export const TracePage = ({ trace, run, verdict, turn, unread }: Props) => (
  <Layout
    title={short(trace.id)}
    section="traces"
    unread={unread}
    crumbs={run ? [[urls.runs(run.dataset_id), 'Runs'], [urls.run(run.id), run.name]] : [[urls.traces(), 'Traces']]}
    action={<a class="btn btn-primary" href={urls.reviewTrace(trace.id, { run: run?.id })}><Icon name="human" />{verdict ? 'Change verdict' : 'Label'}</a>}
  >
    <TraceBody trace={trace} verdict={verdict} turn={turn} />
  </Layout>
);

export const TracePane = ({ trace, run, verdict, closeHref }: { trace: TraceView; run: Run | null; verdict: HumanVerdict | null; closeHref: string }) => (
  <div class="pane-inner" data-trace={trace.id}>
    <div class="pane-head">
      <div class="stack" style="--gap: 2px">
        <a class="link strong mono" href={urls.trace(trace.id)}>{short(trace.id)}</a>
        {run ? <a class="link t-caption" href={urls.run(run.id)}>{run.name}</a> : null}
      </div>
      <div class="cluster" style="--gap: var(--space-8)">
        <a class="btn btn-primary btn-compact" href={urls.reviewTrace(trace.id, { run: run?.id })}><Icon name="human" size="sm" />{verdict ? 'Change' : 'Label'}</a>
        <a class="btn btn-secondary btn-compact" href={urls.trace(trace.id)} aria-label="Open trace page"><Icon name="open" size="sm" />Open</a>
        <a class="btn btn-ghost btn-icon" href={closeHref} data-pane-close aria-label="Close"><Icon name="fail" /></a>
      </div>
    </div>
    <TraceBody trace={trace} verdict={verdict} />
  </div>
);
