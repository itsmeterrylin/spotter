import type { Json } from '../db/types.ts';
import type { JudgeView, VersionView } from '../services/judges.ts';
import { urls } from '../urls.ts';
import { ActivateForm, DisagreementsLink, Rates, StatusPill, versionStatus } from './Judges.tsx';
import { Layout } from './Layout.tsx';
import { when } from './Runs.tsx';
import { Crumbs, Empty, Icon, short } from './ui.tsx';

type Props = { judge: JudgeView; version: VersionView; disagreements: number | null; inbox: number };

const Pre = ({ value }: { value: Json | string | null }) =>
  value === null ? <p class="muted">none</p> : <div class="transcript"><pre class="mono">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre></div>;

export const JudgeVersionPage = ({ judge, version: v, disagreements, inbox }: Props) => {
  const parent = v.parent_id ? judge.versions.find((x) => x.id === v.parent_id) : undefined;
  return (
    <Layout title={`Spotter · ${judge.name} v${v.number}`} inbox={inbox}>
      <Crumbs items={[[urls.judges(), 'Judges'], [judge.url, judge.name]]} />
      <div class="review definition">
        <div class="page-head">
          <h1 class="t-title heavy">
            {judge.name} <span class="num">v{v.number}</span>
          </h1>
          <div class="chips">
            {v.active ? <span class="pill pill-pass"><Icon name="pass" size="sm" />Active</span> : null}
            <StatusPill status={versionStatus(v)} />
            {v.active && disagreements !== null ? <DisagreementsLink name={judge.name} number={v.number} count={disagreements} /> : null}
            {!v.active && v.calibrated ? <ActivateForm name={judge.name} number={v.number} /> : null}
          </div>
        </div>
        <div class="block">
          <span class="block-label"><Icon name="judge" size="sm" />Definition</span>
          <dl class="kv">
            <dt>scope</dt>
            <dd>{v.scope}</dd>
            <dt>model</dt>
            <dd>{v.model}</dd>
            <dt>created by</dt>
            <dd>{v.created_by} · {when(v.created_at)}</dd>
            <dt>parent</dt>
            <dd>{parent ? <a class="link" href={parent.url}>v{parent.number}</a> : 'none'}</dd>
            <dt>hash</dt>
            <dd class="mono">{short(v.content_hash)}</dd>
            <dt>note</dt>
            <dd class="note">{v.note ?? 'none'}</dd>
          </dl>
        </div>
        <div class="block">
          <span class="block-label"><Icon name="trace" size="sm" />Prompt</span>
          <Pre value={v.prompt} />
        </div>
        <div class="block">
          <span class="block-label"><Icon name="settings" size="sm" />Params</span>
          <Pre value={v.params} />
        </div>
        <div class="block">
          <span class="block-label"><Icon name="dataset" size="sm" />Examples</span>
          <Pre value={v.examples} />
        </div>
        <div class="block">
          <span class="block-label"><Icon name="score" size="sm" />Calibration</span>
          {v.calibration.length ? (
            <div class="timeline">
              {v.calibration.map((row) => (
                <div class="card stack">
                  <span class="muted">
                    {row.split} split · {when(row.created_at)}
                    {row.dataset_id ? <> · <a class="link" href={urls.datasetItems(row.dataset_id)}>dataset {short(row.dataset_id)}</a></> : null}
                  </span>
                  <Rates row={row} />
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="judge" title="Needs labels" />
          )}
        </div>
      </div>
    </Layout>
  );
};
