import type { IconName } from '../../../design-system/src/icons.ts';
import type { Calibration } from '../db/repos/judge.ts';
import type { JudgeState } from '../db/types.ts';
import { calibrationBar, type JudgeRow, type JudgeStatus, labelTarget, type VersionView } from '../services/judges.ts';
import { urls } from '../urls.ts';
import type { Shell } from './data.ts';
import { ago, BulkBar, Empty, Icon, JudgeStateIcon, judgeOptions, judgeStateLabel, pct, RowCheck, StatusMenu } from './ui.tsx';
import { Layout, type Tab } from './Layout.tsx';

const pills: Record<JudgeStatus, [string, IconName, string]> = {
  calibrated: ['pill-pass', 'pass', 'Calibrated'],
  needs_labels: ['pill-defer', 'time', 'Needs labels'],
  pending: ['', 'time', 'Pending'],
};

export const versionStatus = (v: VersionView): JudgeStatus => (v.calibrated ? 'calibrated' : v.calibration.length ? 'pending' : 'needs_labels');

export const StatusPill = ({ status }: { status: JudgeStatus }) => {
  const [cls, icon, text] = pills[status];
  return <span class={`pill ${cls}`}><Icon name={icon} size="sm" />{text}</span>;
};

const Rate = ({ label, value }: { label: string; value: number }) => (
  <div class="stat">
    <span class="label">{label}</span>
    <span class="t-heading num">{pct(value)}</span>
    <div class={`bar ${value >= calibrationBar ? 'bar-pass' : 'bar-fail'}`}><i style={`width:${pct(value)}`}></i></div>
  </div>
);

export const Rates = ({ row }: { row: Calibration }) => (
  <div class="cal">
    <Rate label={`TPR · ${row.split} · n=${row.n}`} value={row.tpr} />
    <Rate label={`TNR · ${row.split} · n=${row.n}`} value={row.tnr} />
  </div>
);

export const ActivateForm = ({ name, number }: { name: string; number: number }) => (
  <form method="post" action={`/judges/${name}/activate`}>
    <input type="hidden" name="version" value={String(number)} />
    <button class="btn btn-secondary" type="submit"><Icon name="pass" size="sm" />Activate v{number}</button>
  </form>
);

export const DisagreementsLink = ({ name, number, count }: { name: string; number: number; count: number }) => (
  <a class="link num" href={urls.judgeDisagreements(name, number)}>{count} {count === 1 ? 'disagreement' : 'disagreements'}</a>
);

export type JudgeFilter = JudgeState | 'all';
export const judgeFilters = ['live', 'draft', 'paused', 'all'] as const satisfies readonly JudgeFilter[];
const groupOrder = ['live', 'draft', 'paused'] as const satisfies readonly JudgeState[];

type ListProps = { judges: JudgeRow[]; filter: JudgeFilter; counts: Record<JudgeFilter, number>; shell: Shell };

const listTabs = (filter: JudgeFilter, counts: Record<JudgeFilter, number>): Tab[] =>
  judgeFilters.map((f) => ({ href: urls.judges(f === 'all' ? undefined : f), label: f === 'all' ? 'All' : judgeStateLabel[f], count: counts[f], current: f === filter }));

const calibrationText = (j: JudgeRow): string => (j.calibration ? `TPR ${pct(j.calibration.tpr)} · TNR ${pct(j.calibration.tnr)}` : `needs labels ${j.labels}/${labelTarget}`);

const JudgeListRow = ({ j }: { j: JudgeRow }) => (
  <div class="list-row" data-row data-id={j.name}>
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

export const JudgesPage = ({ judges, filter, counts, shell }: ListProps) => (
  <Layout title="Judges" meta={`${counts[filter]} ${filter === 'all' ? (counts[filter] === 1 ? 'judge' : 'judges') : filter}`} section="judges" shell={shell} tabs={listTabs(filter, counts)} script="judges">
    {judges.length ? (
      <div class="card card-flush judge-list" data-list data-filter={filter}>
        {groupOrder.map((state) => {
          const group = judges.filter((j) => j.state === state);
          return group.length ? (
            <>
              <div class="group-head"><JudgeStateIcon state={state} />{judgeStateLabel[state]}<span class="count">{group.length}</span></div>
              {group.map((j) => <JudgeListRow j={j} />)}
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
