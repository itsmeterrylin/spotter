import type { Json } from '../db/types.ts';
import type { JudgeView, VersionView } from '../services/judges.ts';
import { urls } from '../urls.ts';
import { Rates } from './judgeParts.tsx';
import { Panel } from './panels.tsx';
import type { Shell } from './data.ts';
import { Layout } from './Layout.tsx';
import { when } from './Runs.tsx';
import { Empty, Icon, short } from './ui.tsx';

type Props = { judge: JudgeView; version: VersionView; disagreements: number; shell: Shell };

const Pre = ({ value }: { value: Json | string | null }) =>
  value === null ? <p class="muted">none</p> : <div class="transcript"><pre class="mono">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre></div>;

/** The prompt, params, examples, and calibration of one version. Its facts live in the right panel. */
export const VersionBody = ({ version: v }: { version: VersionView }) => (
  <>
    {v.note ? (
      <div class="block">
        <span class="block-label"><Icon name="menu" size="sm" />Note</span>
        <p class="note">{v.note}</p>
      </div>
    ) : null}
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
        <span class="block-label" id="calibration"><Icon name="score" size="sm" />Calibration</span>
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
  </>
);

export const JudgeVersionPage = ({ judge, version, disagreements, shell }: Props) => (
  <Layout
    title={`${judge.name} v${version.number}`}
    heading
    section="judges"
    shell={shell}
    crumbs={[[urls.judges(), 'Judges'], [judge.url, judge.name]]}
    aside={<aside class="aside" aria-label="Judge version"><Panel data={{ kind: 'version', judge, version, disagreements }} /></aside>}
  >
    <div class="review definition">
      <VersionBody version={version} />
    </div>
  </Layout>
);
