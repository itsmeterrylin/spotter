import type { IssueRow } from '../db/repos/issue.ts';
import type { Run } from '../db/repos/run.ts';
import type { Score } from '../db/repos/score.ts';
import type { Message, TraceEvent } from '../db/types.ts';
import type { TraceView } from '../services/traces.ts';
import { parseMaybeJson } from '../db/json.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict, Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import { Panel } from './panels.tsx';
import { Icon, IconButton, JsonView, pct, short, summarize, Values, VerdictPill } from './ui.tsx';

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

export const NewIssueForm = ({ trace, turn }: { trace: TraceView; turn?: number }) => {
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

const Scores = ({ scores, verdict }: { scores: Score[]; verdict: HumanVerdict | null }) => (
  <div class="card card-flush">
    {scores.filter((s) => s.source !== 'human' && s.turn === null).map((s) => (
      <div class="list-row">
        <Icon name={scoreIcon(s)} size="sm" />
        <div class="grow">{s.name} <span class="muted">· {s.source}</span></div>
        <span class="num strong">{pct(s.value)}</span>
      </div>
    ))}
    {verdict ? (
      <div class="list-row">
        <Icon name="human" size="sm" />
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
      <div class="list-row">
        <Icon name="time" size="sm" />
        <div class="grow">{e.name} <span class="muted num">· {e.at}</span></div>
        {e.data === undefined ? null : <span class="mono t-meta">{summarize(e.data)}</span>}
      </div>
    ))}
  </div>
);

const isEmptyValue = (v: unknown): boolean => v === null || v === undefined;

export const TraceBody = ({ trace, verdict, turn }: { trace: TraceView; verdict: HumanVerdict | null; turn?: number }) => {
  const hasScores = trace.scores.some((s) => s.source !== 'human' && s.turn === null) || verdict !== null;
  return (
    <div class="review">
      <NewIssueForm trace={trace} turn={turn} />
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
    aside={<aside class="aside" aria-label="Trace"><Panel data={{ kind: 'trace', trace, run, verdict, issues }} /></aside>}
  >
    <TraceBody trace={trace} verdict={verdict} turn={turn} />
  </Layout>
);
