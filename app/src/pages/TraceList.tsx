import type { IconName } from '../../../design-system/src/icons.ts';
import type { Run } from '../db/repos/run.ts';
import type { Trace } from '../db/repos/trace.ts';
import { urls } from '../urls.ts';
import { peekRow } from './Peek.tsx';
import { ago, Icon, pct, short, summarize, type Verdict, VerdictPill } from './ui.tsx';

export type TraceItem = { trace: Trace; verdict: Verdict | null; scores: Array<[name: string, value: number]>; run: Run | null };

type Group = { verdict: Verdict | null; label: string; icon: IconName };

/** Failing first, then what still needs a human, then the rest. */
const groups: Group[] = [
  { verdict: 'fail', label: 'Failing', icon: 'fail' },
  { verdict: null, label: 'Unlabeled', icon: 'time' },
  { verdict: 'pass', label: 'Passed', icon: 'pass' },
  { verdict: 'defer', label: 'Deferred', icon: 'defer' },
];

const TraceRow = ({ item: { trace, verdict, scores, run }, selected }: { item: TraceItem; selected?: string }) => (
  <div class="list-row" data-row {...peekRow({ kind: 'trace', id: trace.id }, selected)}>
    <span class="id mono">{short(trace.id)}</span>
    <a class="grow row-link" href={urls.trace(trace.id)}>{summarize(trace.output) || 'No output'}</a>
    {scores.map(([name, value]) => <span class="chip-v num" title={name}>{`${name} ${pct(value)}`}</span>)}
    <VerdictPill verdict={verdict} />
    {run ? <a class="meta run-name" href={urls.traces({ run: run.id })}>{run.name}</a> : null}
    <span class="meta num" title={trace.start}>{ago(trace.start)}</span>
  </div>
);

/** Traces as 44px rows under verdict group headers. A click opens the peek pane where traces.js is loaded. */
export const TraceList = ({ items, selected }: { items: TraceItem[]; selected?: string }) => (
  <div class="card card-flush trace-list" data-list>
    {groups.map(({ verdict, label, icon }) => {
      const rows = items.filter((i) => i.verdict === verdict);
      return rows.length ? (
        <>
          <div class="group-head"><span class={verdict ? `verdict-${verdict}` : undefined}><Icon name={icon} size="sm" /></span>{label}<span class="count">{rows.length}</span></div>
          {rows.map((item) => <TraceRow item={item} selected={selected} />)}
        </>
      ) : null;
    })}
  </div>
);
