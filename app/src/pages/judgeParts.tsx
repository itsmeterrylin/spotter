import type { IconName } from '../../../design-system/src/icons.ts';
import type { Calibration } from '../db/repos/judge.ts';
import { calibrationBar, type JudgeStatus, type VersionView } from '../services/judges.ts';
import { urls } from '../urls.ts';
import { Icon, pct } from './ui.tsx';

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
