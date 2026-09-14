import type { Dataset } from '../db/repos/dataset.ts';
import type { TraceView } from '../services/traces.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict, JudgeSaid, Queue } from './data.ts';
import { Layout } from './Layout.tsx';
import { Turns } from './Trace.tsx';
import { Crumbs, Empty, Icon, JsonView, type Verdict } from './ui.tsx';

type Props = {
  trace: TraceView;
  verdict: HumanVerdict | null;
  judgeSaid: JudgeSaid | null;
  score: string;
  queue: Queue;
  next: string | null;
  prev: string | null;
  datasets: Dataset[];
  inbox: number;
};

const verdicts: Array<[Verdict, string, string]> = [
  ['pass', 'Pass', '1'],
  ['fail', 'Fail', '2'],
  ['defer', 'Defer', 'D'],
];

const Nav = ({ href, name, label }: { href: string | null; name: 'previous' | 'next'; label: string }) =>
  href ? (
    <a class="btn btn-ghost btn-icon" href={href} aria-label={label} data-nav={name}><Icon name={name} /></a>
  ) : (
    <span class="btn btn-ghost btn-icon" aria-disabled="true" aria-label={label}><Icon name={name} /></span>
  );

const crumbsOf = (queue: Queue): Array<[string, string]> => {
  if (queue.judge) return [[urls.judge(queue.judge.name), queue.judge.name]];
  return queue.run ? [[urls.run(queue.run.id), queue.run.name]] : [];
};

export const ReviewPage = ({ trace, verdict, judgeSaid, score, queue, next, prev, datasets, inbox }: Props) => (
  <Layout title="Spotter Review" inbox={inbox} script="review">
    <Crumbs items={crumbsOf(queue)} />
    <div
      class="review"
      id="review"
      data-trace={trace.id}
      data-score={score}
      data-next={next ?? ''}
      data-prev={prev ?? ''}
      data-inbox={urls.inbox()}
      data-verdict={verdict?.verdict ?? ''}
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
        {trace.messages?.length ? <Turns messages={trace.messages} scores={trace.scores} /> : <JsonView value={trace.input} />}
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
      <div class="verdict-row">
        {verdicts.map(([v, label, key]) => (
          <button class={`btn btn-${v}`} type="button" data-verdict={v} aria-pressed={verdict?.verdict === v ? 'true' : 'false'}>
            <Icon name={v} />{label}<span class="kbd">{key}</span>
          </button>
        ))}
      </div>
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

export const ReviewEmpty = ({ inbox }: { inbox: number }) => (
  <Layout title="Spotter Review" inbox={inbox}>
    <Crumbs items={[]} />
    <Empty icon="pass" title="Nothing to label" action={<a class="btn btn-primary" href={urls.inbox()}>Inbox</a>} />
  </Layout>
);
