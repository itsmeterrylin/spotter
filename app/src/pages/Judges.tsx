import type { IconName } from '../../../design-system/src/icons.ts';
import type { Calibration } from '../db/repos/judge.ts';
import { calibrationBar, type JudgeRow, type JudgeStatus, type JudgeView, type VersionView } from '../services/judges.ts';
import { urls } from '../urls.ts';
import { Layout } from './Layout.tsx';
import { Empty, Icon, pct } from './ui.tsx';

const pills: Record<JudgeStatus, [string, IconName, string]> = {
  calibrated: ['pill-pass', 'pass', 'Calibrated'],
  needs_labels: ['pill-defer', 'time', 'Needs labels'],
  pending: ['pill-brand', 'time', 'Pending'],
};

export const versionStatus = (v: VersionView): JudgeStatus => (v.calibrated ? 'calibrated' : v.calibration.length ? 'pending' : 'needs_labels');

export const shownRow = (cals: Calibration[]): Calibration | null => cals.find((c) => c.split === 'test') ?? cals[0] ?? null;

export const StatusPill = ({ status }: { status: JudgeStatus }) => {
  const [cls, icon, text] = pills[status];
  return <span class={`pill ${cls}`}><Icon name={icon} size="sm" />{text}</span>;
};

const Rate = ({ label, value }: { label: string; value: number }) => (
  <div class="stat">
    <span class="label">{label}</span>
    <span class="t-title num">{pct(value)}</span>
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
    <button class="btn btn-secondary btn-compact" type="submit"><Icon name="pass" size="sm" />Activate v{number}</button>
  </form>
);

export const DisagreementsLink = ({ name, number, count }: { name: string; number: number; count: number }) => (
  <a class="link num" href={urls.judgeDisagreements(name, number)}>{count} {count === 1 ? 'disagreement' : 'disagreements'}</a>
);

type ListProps = { judges: JudgeRow[]; unread: number };

export const JudgesPage = ({ judges, unread }: ListProps) => (
  <Layout title="Judges" section="judges" unread={unread}>
    {judges.length ? (
      <div class="card card-flush">
        {judges.map((j) => (
          <div class="row">
            <Icon name="judge" />
            <div class="grow">
              <a class="link" href={j.url}>{j.name}</a>{' '}
              <span class="muted num">
                · {j.active_version === null ? 'no active version' : `v${j.active_version} active`} · {j.version_count} {j.version_count === 1 ? 'version' : 'versions'}
              </span>
            </div>
            {j.active_version !== null ? <DisagreementsLink name={j.name} number={j.active_version} count={j.disagreements} /> : null}
            <StatusPill status={j.status} />
          </div>
        ))}
      </div>
    ) : (
      <Empty icon="judge" title="No judges yet" />
    )}
  </Layout>
);

type VersionProps = { name: string; version: VersionView; disagreements: number | null };

const Version = ({ name, version: v, disagreements }: VersionProps) => {
  const row = shownRow(v.calibration);
  return (
    <div class="version" data-active={v.active ? '1' : undefined}>
      <div class="stack" style="--gap: 4px">
        <a class="link t-title num" href={v.url}>v{v.number}</a>
        {v.active ? <span class="pill pill-pass"><Icon name="pass" size="sm" />Active</span> : null}
      </div>
      <div class="stack">
        <span class="muted note">
          {v.note ?? v.model} <span class="muted">· {v.created_by}</span>
        </span>
        {row ? <Rates row={row} /> : <StatusPill status="needs_labels" />}
      </div>
      <div class="actions">
        {v.active && disagreements !== null ? <DisagreementsLink name={name} number={v.number} count={disagreements} /> : null}
        {!v.active && v.calibrated ? <ActivateForm name={name} number={v.number} /> : null}
      </div>
    </div>
  );
};

type DetailProps = { judge: JudgeView; disagreements: number | null; unread: number };

export const JudgePage = ({ judge, disagreements, unread }: DetailProps) => (
  <Layout title={judge.name} section="judges" unread={unread} crumbs={[[urls.judges(), 'Judges']]}>
    <div class="page-head">
      <div class="chips">
        <span class="t-caption muted num">{judge.versions.length} {judge.versions.length === 1 ? 'version' : 'versions'}</span>
        <StatusPill status={judge.status} />
      </div>
    </div>
    {judge.versions.length ? (
      <div class="timeline">{judge.versions.map((v) => <Version name={judge.name} version={v} disagreements={disagreements} />)}</div>
    ) : (
      <Empty icon="judge" title="No versions yet" />
    )}
  </Layout>
);
