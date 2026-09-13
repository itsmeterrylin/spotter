import type { Run } from '../db/repos/run.ts';
import type { Score } from '../db/repos/score.ts';
import type { Message } from '../db/types.ts';
import type { TraceView } from '../services/traces.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict } from './data.ts';
import { Layout } from './Layout.tsx';
import { Crumbs, Icon, JsonView, pct, short, summarize, VerdictPill } from './ui.tsx';

const scoreIcon = (s: Score): 'pass' | 'fail' | 'score' => (s.value === 1 ? 'pass' : s.value === 0 ? 'fail' : 'score');

export const Turns = ({ messages, scores, focus }: { messages: Message[]; scores: Score[]; focus?: number }) => (
  <div class="transcript">
    {messages.map((m) => (
      <div class="turn" id={`turn-${m.turn}`} data-focus={m.turn === focus ? '1' : undefined}>
        <span class="who">{m.role} · {m.turn}</span>
        <span>
          {summarize(m.content)}
          {scores.filter((s) => s.turn === m.turn).map((s) => (
            <>
              <br />
              <span class={`pill pill-${s.value === 1 ? 'pass' : 'fail'}`}><Icon name={s.value === 1 ? 'pass' : 'fail'} size="sm" />{s.name}</span>
            </>
          ))}
        </span>
      </div>
    ))}
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

type Props = { trace: TraceView; run: Run | null; verdict: HumanVerdict | null; turn?: number; inbox: number };

export const TracePage = ({ trace, run, verdict, turn, inbox }: Props) => (
  <Layout title={`Spotter · ${short(trace.id)}`} inbox={inbox}>
    <Crumbs items={run ? [[urls.run(run.id), run.name]] : []} />
    <div class="review">
      <div class="page-head">
        <h1 class="t-title heavy mono">{short(trace.id)}</h1>
        <a class="btn btn-primary" href={urls.reviewTrace(trace.id, run?.id)}><Icon name="human" />{verdict ? 'Change verdict' : 'Label'}</a>
      </div>
      <div class="block">
        <span class="block-label"><Icon name="trace" size="sm" />{trace.messages?.length ? 'Conversation' : 'Input'}</span>
        {trace.messages?.length ? <Turns messages={trace.messages} scores={trace.scores} focus={turn} /> : <JsonView value={trace.input} />}
      </div>
      <div class="block">
        <span class="block-label"><Icon name="score" size="sm" />Output</span>
        <JsonView value={trace.output} />
      </div>
      <div class="block">
        <span class="block-label"><Icon name="flag" size="sm" />Expected</span>
        <JsonView value={trace.expected} />
      </div>
      <div class="block">
        <span class="block-label"><Icon name="judge" size="sm" />Scores</span>
        <Scores scores={trace.scores} verdict={verdict} />
      </div>
    </div>
  </Layout>
);
