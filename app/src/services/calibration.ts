import type { LabelPair } from '../db/repos/judge.ts';
import type { Repos } from '../db/repos/index.ts';
import type { Split } from '../db/types.ts';
import { notFound } from '../errors.ts';
import { urls } from '../urls.ts';
import { calibrationBar, requireVersion } from './judges.ts';

export type Rates = { tpr: number; tnr: number; n: number };
export type Bucket = Split | 'examples';
export type Interval = [number, number];

export type CalibrationReport = {
  judge: string;
  version: number;
  judge_version_id: string;
  dataset_id: string | null;
  tpr: number;
  tnr: number;
  n: number;
  corrected: number | null;
  ci: Interval | null;
  observed: number;
  scored: number;
  dev: Rates;
  test: Rates;
  examples: number;
  calibrated: boolean;
  url: string;
};

export const iterations = 1000;

const examplesShare = 15;
const devShare = 45;

export const bucketOf = (traceId: string): Bucket => {
  const head = new Bun.CryptoHasher('sha256').update(traceId).digest('hex').slice(0, 8);
  const slot = Number.parseInt(head, 16) % 100;
  if (slot < examplesShare) return 'examples';
  return slot < examplesShare + devShare ? 'dev' : 'test';
};

const passes = (value: number): boolean => value >= 0.5;

const share = (hits: number, total: number): number => (total === 0 ? 0 : hits / total);

export function rates(pairs: LabelPair[]): Rates {
  const positives = pairs.filter((p) => passes(p.human));
  const negatives = pairs.filter((p) => !passes(p.human));
  return {
    tpr: share(positives.filter((p) => passes(p.judge)).length, positives.length),
    tnr: share(negatives.filter((p) => !passes(p.judge)).length, negatives.length),
    n: pairs.length,
  };
}

export function correct(observed: number, tpr: number, tnr: number): number | null {
  const power = tpr + tnr - 1;
  if (power <= 0) return null;
  return Math.min(1, Math.max(0, (observed + tnr - 1) / power));
}

const mulberry32 = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export function bootstrap(pairs: LabelPair[], values: number[], seed = 1): Interval | null {
  if (pairs.length === 0 || values.length === 0) return null;
  const rand = mulberry32(seed);
  const resample = <T>(xs: T[]): T[] => xs.map(() => xs[Math.floor(rand() * xs.length)]).filter((x): x is T => x !== undefined);
  const samples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const r = rates(resample(pairs));
    const drawn = resample(values);
    const p = correct(share(drawn.filter(passes).length, drawn.length), r.tpr, r.tnr);
    if (p !== null) samples.push(p);
  }
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  return [at(0.025), at(0.975)];
}

const scopedPairs = (repos: Repos, versionId: string, datasetId: string | null): LabelPair[] => {
  const pairs = repos.judges.pairs(versionId);
  if (!datasetId) return pairs;
  const inScope = new Set(repos.datasets.listItems(datasetId).map((i) => i.source_trace_id));
  return pairs.filter((p) => inScope.has(p.trace_id));
};

export function calibrate(repos: Repos, name: string, number: number, datasetId: string | null = null): CalibrationReport {
  const { version } = requireVersion(repos, name, number);
  if (datasetId && !repos.datasets.get(datasetId)) throw notFound('dataset', datasetId);
  const buckets: Record<Bucket, LabelPair[]> = { examples: [], dev: [], test: [] };
  for (const p of scopedPairs(repos, version.id, datasetId)) buckets[bucketOf(p.trace_id)].push(p);
  const dev = rates(buckets.dev);
  const test = rates(buckets.test);
  repos.tx(() => {
    if (dev.n) repos.judges.putCalibration({ judge_version_id: version.id, dataset_id: datasetId, split: 'dev', ...dev });
    if (test.n) repos.judges.putCalibration({ judge_version_id: version.id, dataset_id: datasetId, split: 'test', ...test });
  });
  const values = repos.judges.judgedValues(version.id);
  const observed = share(values.filter(passes).length, values.length);
  return {
    judge: name,
    version: version.number,
    judge_version_id: version.id,
    dataset_id: datasetId,
    tpr: test.tpr,
    tnr: test.tnr,
    n: test.n,
    corrected: test.n ? correct(observed, test.tpr, test.tnr) : null,
    ci: test.n ? bootstrap(buckets.test, values) : null,
    observed,
    scored: values.length,
    dev,
    test,
    examples: buckets.examples.length,
    calibrated: test.n > 0 && test.tpr >= calibrationBar && test.tnr >= calibrationBar,
    url: urls.judgeVersion(name, version.number),
  };
}
