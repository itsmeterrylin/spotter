import type { Calibration, Judge, JudgeVersion } from '../db/repos/judge.ts';
import { urls } from '../urls.ts';
import { Layout } from './Layout.tsx';
import { Crumbs, Empty, Icon, pct } from './ui.tsx';

export type VersionRow = { version: JudgeVersion; calibration: Calibration | null; active: boolean };

type ListProps = { judges: Array<{ judge: Judge; versions: number; calibrated: boolean }>; inbox: number };

export const JudgesPage = ({ judges, inbox }: ListProps) => (
  <Layout title="Spotter Judges" inbox={inbox}>
    <Crumbs items={[]} />
    <div class="page-head">
      <h1 class="t-title heavy">Judges</h1>
    </div>
    {judges.length ? (
      <div class="card card-flush">
        {judges.map(({ judge, versions, calibrated }) => (
          <div class="row">
            <Icon name="judge" />
            <div class="grow">
              <a class="link" href={urls.judge(judge.name)}>{judge.name}</a> <span class="muted num">· {versions} {versions === 1 ? 'version' : 'versions'}</span>
            </div>
            {calibrated ? (
              <span class="pill pill-pass"><Icon name="pass" size="sm" />Calibrated</span>
            ) : (
              <span class="pill pill-defer"><Icon name="time" size="sm" />Needs labels</span>
            )}
          </div>
        ))}
      </div>
    ) : (
      <Empty icon="judge" title="No judges yet" />
    )}
  </Layout>
);

const Rate = ({ label, value }: { label: string; value: number }) => (
  <div class="stat">
    <span class="label">{label}</span>
    <span class="t-title num">{pct(value)}</span>
    <div class={`bar ${value >= 0.9 ? 'bar-pass' : 'bar-fail'}`}><i style={`width:${pct(value)}`}></i></div>
  </div>
);

const Version = ({ version, calibration, active }: VersionRow) => (
  <div class="version" data-active={active ? '1' : undefined}>
    <div class="stack" style="--gap: 4px">
      <span class="t-title num">v{version.number}</span>
      {active ? <span class="pill pill-pass"><Icon name="pass" size="sm" />Active</span> : null}
    </div>
    <div class="stack">
      <span class="muted">
        {version.note ?? version.model} <span class="muted">· {version.created_by}</span>
      </span>
      {calibration ? (
        <div class="cal">
          <Rate label={`TPR · n=${calibration.n}`} value={calibration.tpr} />
          <Rate label={`TNR · n=${calibration.n}`} value={calibration.tnr} />
        </div>
      ) : (
        <span class="pill pill-defer"><Icon name="time" size="sm" />Needs labels</span>
      )}
    </div>
    <div class="stack"></div>
  </div>
);

type DetailProps = { judge: Judge; rows: VersionRow[]; inbox: number };

export const JudgePage = ({ judge, rows, inbox }: DetailProps) => (
  <Layout title={`Spotter · ${judge.name}`} inbox={inbox}>
    <Crumbs items={[[urls.judges(), 'Judges']]} />
    <div class="page-head">
      <h1 class="t-title heavy">{judge.name}</h1>
      <span class="t-caption muted num">{rows.length} {rows.length === 1 ? 'version' : 'versions'}</span>
    </div>
    {rows.length ? (
      <div class="timeline">{rows.map((r) => <Version {...r} />)}</div>
    ) : (
      <Empty icon="judge" title="No versions yet" />
    )}
  </Layout>
);
