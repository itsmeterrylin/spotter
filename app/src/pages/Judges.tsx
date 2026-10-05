import type { JudgeState } from '../db/types.ts';
import { type JudgeRow, labelTarget } from '../services/judges.ts';
import { urls } from '../urls.ts';
import type { Child } from 'hono/jsx';
import type { Shell } from './data.ts';
import { PeekRegion, peekRow } from './Peek.tsx';
import { ago, BulkBar, Empty, Icon, JudgeStateIcon, judgeOptions, judgeStateLabel, pct, RowCheck, StatusMenu } from './ui.tsx';
import { Layout, type Tab } from './Layout.tsx';

export type JudgeFilter = JudgeState | 'all';
export const judgeFilters = ['live', 'draft', 'paused', 'all'] as const satisfies readonly JudgeFilter[];
const groupOrder = ['live', 'draft', 'paused'] as const satisfies readonly JudgeState[];

type ListProps = { judges: JudgeRow[]; filter: JudgeFilter; counts: Record<JudgeFilter, number>; shell: Shell; selected?: string; pane?: Child };

const listTabs = (filter: JudgeFilter, counts: Record<JudgeFilter, number>): Tab[] =>
  judgeFilters.map((f) => ({ href: urls.judges(f === 'all' ? undefined : f), label: f === 'all' ? 'All' : judgeStateLabel[f], count: counts[f], current: f === filter }));

const calibrationText = (j: JudgeRow): string => (j.calibration ? `TPR ${pct(j.calibration.tpr)} · TNR ${pct(j.calibration.tnr)}` : `needs labels ${j.labels}/${labelTarget}`);

const JudgeListRow = ({ j, selected }: { j: JudgeRow; selected?: string }) => (
  <div class="list-row" data-row data-id={j.name} {...peekRow({ kind: 'judge', name: j.name }, selected)}>
    <RowCheck label={j.name} />
    <StatusMenu kind="judge" id={j.name} current={j.state} options={judgeOptions(j.state, j.live_blocker)} />
    <a class="strong row-link" href={j.url}>{j.name}</a>
    <span class="chip-v num">{j.active_version === null ? 'no version' : `v${j.active_version}`}</span>
    <span class="grow muted cal-text num">{calibrationText(j)}</span>
    {j.disagreements_url ? (
      <a class="meta num" href={j.disagreements_url} title="Disagreements"><Icon name="flag" size="sm" />{j.disagreements}</a>
    ) : (
      <span class="meta num" title="Disagreements"><Icon name="flag" size="sm" />0</span>
    )}
    <span class="meta num" title="Open issues"><Icon name="issue" size="sm" />{j.open_issues}</span>
    <span class="meta num updated" title={j.updated_at}>{ago(j.updated_at)}</span>
  </div>
);

export const JudgesPage = ({ judges, filter, counts, shell, selected, pane }: ListProps) => (
  <Layout title="Judges" section="judges" shell={shell} tabs={listTabs(filter, counts)} script="judges" aside={<PeekRegion>{pane}</PeekRegion>}>
    {judges.length ? (
      <div class="card card-flush judge-list" data-list data-filter={filter}>
        {groupOrder.map((state) => {
          const group = judges.filter((j) => j.state === state);
          return group.length ? (
            <>
              <div class="group-head"><JudgeStateIcon state={state} />{judgeStateLabel[state]}<span class="count">{group.length}</span></div>
              {group.map((j) => <JudgeListRow j={j} selected={selected} />)}
            </>
          ) : null;
        })}
        <BulkBar kind="judge" options={judgeOptions(null)} />
      </div>
    ) : (
      <Empty icon="judge" title={filter === 'all' ? 'No judges yet' : `No ${filter} judges`} />
    )}
  </Layout>
);
