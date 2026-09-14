import type { Run } from '../db/repos/run.ts';
import type { Score } from '../db/repos/score.ts';
import type { Message, TraceEvent } from '../db/types.ts';
import type { TraceView } from '../services/traces.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict } from './data.ts';
import { Layout } from './Layout.tsx';
import { Icon, JsonView, pct, short, summarize, Values, VerdictPill } from './ui.tsx';

const scoreIcon = (s: Score): 'pass' | 'fail' | 'score' => (s.value === 1 ? 'pass' : s.value === 0 ? 'fail' : 'score');

export const Turn = ({ message: m, scores, focus }: { message: Message; scores: Score[]; focus?: boolean }) => (
  <div class="turn" id={`turn-${m.turn}`} data-focus={focus ? '1' : undefined}>
    <span class="who">{m.role} · {m.turn}</span>
    <span>
      {summarize(m.content)}
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

type Props = { trace: TraceView; run: Run | null; verdict: HumanVerdict | null; turn?: number; unread: number };

export const TracePage = ({ trace, run, verdict, turn, unread }: Props) => (
  <Layout
    title={short(trace.id)}
    section="traces"
    unread={unread}
    crumbs={run ? [[urls.runs(run.dataset_id), 'Runs'], [urls.run(run.id), run.name]] : [[urls.traces(), 'Traces']]}
    action={<a class="btn btn-primary" href={urls.reviewTrace(trace.id, { run: run?.id })}><Icon name="human" />{verdict ? 'Change verdict' : 'Label'}</a>}
  >
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
  </Layout>
);
