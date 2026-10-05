import { createClient, type ClientConfig } from './client.ts';
import { resolveVersion } from './judge-run.ts';

export type Rates = { tpr: number; tnr: number; n: number };
export type CalibrateOptions = { name: string; version: string; dataset?: string; client: ClientConfig };
export type CalibrateReport = {
  judge: string;
  version: number;
  dataset_id: string | null;
  tpr: number;
  tnr: number;
  n: number;
  corrected: number | null;
  ci: [number, number] | null;
  observed: number;
  scored: number;
  dev: Rates;
  test: Rates;
  examples: number;
  calibrated: boolean;
  url: string;
};

export async function judgeCalibrate(options: CalibrateOptions): Promise<CalibrateReport> {
  const client = createClient(options.client);
  const { def } = await resolveVersion(client, options.name, options.version);
  const path = `/api/judges/${encodeURIComponent(options.name)}/versions/${def.number}/calibrate`;
  return (await client.post(path, { dataset_id: options.dataset ?? null })) as CalibrateReport;
}

const pct = (x: number): string => `${Math.round(x * 100)}%`;

const rateLine = (label: string, r: Rates): string => `${label}  n=${String(r.n).padEnd(4)} TPR ${pct(r.tpr).padStart(4)}  TNR ${pct(r.tnr).padStart(4)}`;

export function formatCalibration(r: CalibrateReport): string {
  const corrected = r.corrected === null ? 'n/a (test split is empty or the judge is no better than chance)' : pct(r.corrected);
  const ci = r.ci ? ` (95% interval ${pct(r.ci[0])} to ${pct(r.ci[1])})` : '';
  return [
    `judge ${r.judge} v${r.version} calibration${r.dataset_id ? ` on dataset ${r.dataset_id}` : ''}: ${r.calibrated ? 'calibrated' : 'pending'}`,
    rateLine('dev ', r.dev),
    rateLine('test', r.test),
    `examples pool ${r.examples} · observed pass rate ${pct(r.observed)} over ${r.scored} judge scores`,
    `corrected pass rate ${corrected}${ci}`,
    '',
    `version  ${r.url}`,
  ].join('\n');
}
