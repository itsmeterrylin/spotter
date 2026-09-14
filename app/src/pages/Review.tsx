import type { Dataset } from '../db/repos/dataset.ts';
import type { Score } from '../db/repos/score.ts';
import type { Message } from '../db/types.ts';
import type { TraceView } from '../services/traces.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict, JudgeSaid, Queue } from './data.ts';
import { Layout } from './Layout.tsx';
import { Turn } from './Trace.tsx';
import { type Crumb, Empty, Icon, JsonView, type Verdict } from './ui.tsx';

type Props = {
  trace: TraceView;
  verdict: HumanVerdict | null;
  judgeSaid: JudgeSaid | null;
  score: string;
  queue: Queue;
  next: string | null;
  prev: string | null;
  datasets: Dataset[];
  turn?: number;
  unread: number;
};

const verdicts: Array<[Verdict, string, string]> = [
  ['pass', 'Pass', '1'],
  ['fail', 'Fail', '2'],
  ['defer', 'Defer', 'D'],
];

const isVerdict = (s: string | null): s is Verdict => s === 'pass' || s === 'fail' || s === 'defer';

const turnVerdict = (scores: Score[], name: string, turn: number): Verdict | null => {
  const s = scores.find((x) => x.source === 'human' && x.name === name && x.turn === turn);
  return s && isVerdict(s.label) ? s.label : null;
};

type RowProps = { turn: number | null; verdict: Verdict | null; focus: boolean };

const VerdictRow = ({ turn, verdict, focus }: RowProps) => (
  <div class={turn === null ? 'verdict-row' : 'verdict-row verdict-row-turn'} data-turn={turn ?? ''} data-verdict={verdict ?? ''} data-focus={focus ? '1' : undefined}>
    {verdicts.map(([v, label, key]) => (
      <button class={`btn btn-${v}${turn === null ? '' : ' btn-compact'}`} type="button" data-verdict={v} aria-pressed={verdict === v ? 'true' : 'false'}>
        <Icon name={v} />{label}{turn === null ? <span class="kbd">{key}</span> : null}
      </button>
    ))}
  </div>
);

const Conversation = ({ messages, scores, name, focus }: { messages: Message[]; scores: Score[]; name: string; focus?: number }) => (
  <div class="transcript">
    {messages.map((m) => (
      <>
        <Turn message={m} scores={scores.filter((s) => s.source !== 'human')} />
        {m.role === 'assistant' ? <VerdictRow turn={m.turn} verdict={turnVerdict(scores, name, m.turn)} focus={m.turn === focus} /> : null}
      </>
    ))}
  </div>
);

const Nav = ({ href, name, label }: { href: string | null; name: 'previous' | 'next'; label: string }) =>
  href ? (
    <a class="btn btn-ghost btn-icon" href={href} aria-label={label} data-nav={name}><Icon name={name} /></a>
  ) : (
    <span class="btn btn-ghost btn-icon" aria-disabled="true" aria-label={label}><Icon name={name} /></span>
  );

const crumbsOf = (queue: Queue): Crumb[] => {
  if (queue.judge) return [[urls.judges(), 'Judges'], [urls.judge(queue.judge.name), queue.judge.name]];
  return queue.run ? [[urls.runs(queue.run.dataset_id), 'Runs'], [urls.run(queue.run.id), queue.run.name]] : [[urls.traces(), 'Traces']];
};

export const ReviewPage = ({ trace, verdict, judgeSaid, score, queue, next, prev, datasets, turn, unread }: Props) => (
  <Layout title="Review" section={queue.judge ? 'judges' : 'traces'} unread={unread} crumbs={crumbsOf(queue)} script="review">
    <div
      class="review"
      id="review"
      data-trace={trace.id}
      data-score={score}
      data-next={next ?? ''}
      data-prev={prev ?? ''}
      data-home={urls.notifications()}
    >
      <div class="cluster" style="justify-content: space-between">
        <span class="t-title num">
          {queue.ids.length} <span class="muted">left</span>
          {queue.judge ? <span class="muted"> · disagreements with {queue.judge.name} v{queue.judge.version}</span> : queue.run ? <span class="muted"> · {queue.run.name}</span> : null}
        </span>
        <div class="cluster">
          <Nav href={prev} name="previous" label="Previous" />
          <Nav href={next} name="next" label="Next" />
        </div>
      </div>
      <div class="block">
        <span class="block-label"><Icon name="trace" size="sm" />{trace.messages?.length ? 'Conversation' : 'Input'}</span>
        {trace.messages?.length ? <Conversation messages={trace.messages} scores={trace.scores} name={score} focus={turn} /> : <JsonView value={trace.input} />}
      </div>
      <div class="block">
        <span class="block-label"><Icon name="score" size="sm" />Output</span>
        <JsonView value={trace.output} />
      </div>
      <div class="block">
        <span class="block-label"><Icon name="flag" size="sm" />Expected</span>
        <JsonView value={trace.expected} />
      </div>
      {judgeSaid ? (
        <p class="judge-said">
          <Icon name="judge" size="sm" />Judge v{judgeSaid.version} said {judgeSaid.verdict}
          {judgeSaid.reason ? <span class="muted"> · {judgeSaid.reason}</span> : null}
        </p>
      ) : null}
      <VerdictRow turn={null} verdict={verdict?.verdict ?? null} focus={turn === undefined} />
      <p class="error" id="error" aria-live="polite"></p>
      <div class="field">
        <label for="note">Note</label>
        <textarea class="input" id="note">{verdict?.note ?? ''}</textarea>
      </div>
      <div class="hint">
        <span class="kbd">A</span>add to dataset <span class="kbd">U</span>undo <span class="kbd">⌘↵</span>save and next
      </div>
    </div>
    <div class="picker" id="picker">
      <div class="card stack">
        <span class="t-title">Add to dataset</span>
        <div class="stack" id="pickerOptions">
          {datasets.map((d) => (
            <button type="button" class="btn btn-secondary opt" data-dataset={d.id}><Icon name="dataset" />{d.name}</button>
          ))}
        </div>
        <button type="button" class="btn btn-ghost" data-picker-close>Cancel</button>
      </div>
    </div>
  </Layout>
);

export const ReviewEmpty = ({ unread }: { unread: number }) => (
  <Layout title="Review" section="traces" unread={unread}>
    <Empty icon="pass" title="Nothing to label" action={<a class="btn btn-primary" href={urls.notifications()}>Notifications</a>} />
  </Layout>
);
