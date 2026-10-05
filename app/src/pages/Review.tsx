import type { Dataset } from '../db/repos/dataset.ts';
import type { Score } from '../db/repos/score.ts';
import type { Message } from '../db/types.ts';
import type { TraceView } from '../services/traces.ts';
import { urls } from '../urls.ts';
import type { JudgeSaid, Queue, Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import type { PanelData } from './panelData.ts';
import { Panel, VerdictRow } from './panels.tsx';
import { Turn } from './Trace.tsx';
import { type Crumb, Empty, Icon, JsonView, short, type Verdict } from './ui.tsx';

type Props = {
  panel: Extract<PanelData, { kind: 'trace' }>;
  judgeSaid: JudgeSaid | null;
  score: string;
  queue: Queue;
  next: string | null;
  prev: string | null;
  datasets: Dataset[];
  turn?: number;
  shell: Shell;
};

const isVerdict = (s: string | null): s is Verdict => s === 'pass' || s === 'fail' || s === 'defer';

const turnVerdict = (scores: Score[], name: string, turn: number): Verdict | null => {
  const s = scores.find((x) => x.source === 'human' && x.name === name && x.turn === turn);
  return s && isVerdict(s.label) ? s.label : null;
};

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

const crumbsOf = (queue: Queue): Crumb[] => {
  if (queue.judge) return [[urls.judges(), 'Judges'], [urls.judge(queue.judge.name), queue.judge.name]];
  return queue.run ? [[urls.runs(queue.run.dataset_id), 'Runs'], [urls.run(queue.run.id), queue.run.name]] : [[urls.traces(), 'Traces']];
};

export const ReviewPage = ({ panel, judgeSaid, score, queue, next, prev, datasets, turn, shell }: Props) => {
  const { trace, verdict } = panel;
  return (
  <Layout
    title={short(trace.id)}
    heading
    section={queue.judge ? 'judges' : 'traces'}
    shell={shell}
    crumbs={crumbsOf(queue)}
    script="review"
    aside={<aside class="aside" aria-label="Review"><Panel data={panel} /></aside>}
  >
    <div
      class="review"
      id="review"
      data-trace={trace.id}
      data-score={score}
      data-next={next ?? ''}
      data-prev={prev ?? ''}
      data-home={urls.notifications()}
    >
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
          <Icon name="judge" size="sm" />Judge v{judgeSaid.version} said {judgeSaid.result.verdict}{judgeSaid.result.failingTurns ? ` · ${judgeSaid.result.failingTurns} ${judgeSaid.result.failingTurns === 1 ? 'turn' : 'turns'}` : ''}
          {judgeSaid.reason ? <span class="muted"> · {judgeSaid.reason}</span> : null}
        </p>
      ) : null}
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
        <span class="t-heading">Add to dataset</span>
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
};

export const ReviewEmpty = ({ shell }: { shell: Shell }) => (
  <Layout title="Review" section="traces" shell={shell}>
    <Empty icon="pass" title="Nothing to label" action={<a class="btn btn-primary" href={urls.notifications()}>Notifications</a>} />
  </Layout>
);
