import type { Child } from 'hono/jsx';
import type { Trace } from '../db/repos/trace.ts';
import { urls } from '../urls.ts';
import type { HumanVerdict, Shell } from './data.ts';
import type { JudgeResult } from './judgeResult.ts';
import { Layout } from './Layout.tsx';
import type { PanelData } from './panelData.ts';
import { Panel } from './panels.tsx';
import { PeekRegion } from './Peek.tsx';
import { TraceList } from './TraceList.tsx';
import { Empty, IconButton } from './ui.tsx';

export type TraceRow = { trace: Trace; verdict: HumanVerdict | null; judges: JudgeResult[]; value: number | null };

type Props = { data: Extract<PanelData, { kind: 'run' }>; rows: TraceRow[]; shell: Shell; selected?: string; pane?: Child };

export const RunPage = ({ data, rows, shell, selected, pane }: Props) => {
  const { card } = data;
  const { run, baseline, primary } = card;
  const compareUrl = baseline ? urls.compare(run.dataset_id, [baseline.id, run.id], 'changes') : null;
  const action = baseline && compareUrl ? <IconButton href={compareUrl} icon="compare" label={`Compare with ${baseline.name}`} /> : undefined;
  return (
    <Layout title={run.name} heading section="runs" shell={shell} crumbs={[[urls.runs(run.dataset_id), 'Runs']]} actions={action} script="rows" aside={<><aside class="aside" aria-label="Run"><Panel data={data} /></aside><PeekRegion>{pane}</PeekRegion></>}>
      {rows.length ? (
        <TraceList items={rows.map(({ trace, verdict, judges, value }) => ({ trace, verdict: verdict?.verdict ?? null, run: null, judges, scores: primary && value !== null ? [[primary, value]] : [] }))} selected={selected} />
      ) : (
        <Empty icon="trace" title="No traces yet" />
      )}
    </Layout>
  );
};
