import { config } from './config.ts';

type Query = Record<string, string | number | undefined | null>;

export type ReviewQuery = { run?: string | null; filter?: string; judge?: string; version?: number };

const abs = (path: string, query: Query = {}): string => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  const qs = params.toString();
  return `${config.baseUrl}${path}${qs ? `?${qs}` : ''}`;
};

export const urls = {
  home: (): string => abs('/'),
  notifications: (): string => abs('/notifications'),
  runs: (datasetId?: string): string => abs('/runs', { dataset: datasetId }),
  run: (id: string, score?: string): string => abs(`/runs/${id}`, { score }),
  compare: (datasetId: string, runIds: string[], only?: 'changes', score?: string): string =>
    abs(`/datasets/${datasetId}/compare`, { runs: runIds.join(','), only, score }),
  trace: (id: string, turn?: number): string => abs(`/traces/${id}`, { turn }),
  traces: (query: Query = {}): string => abs('/traces', query),
  datasets: (): string => abs('/datasets'),
  dataset: (id: string): string => abs(`/datasets/${id}`),
  datasetItems: (datasetId: string, tag?: string): string => abs(`/datasets/${datasetId}/items`, { tag }),
  datasetItem: (datasetId: string, itemId: string): string => abs(`/datasets/${datasetId}/items/${itemId}`),
  review: (q: ReviewQuery = {}): string => abs('/review', q),
  reviewTrace: (traceId: string, q: ReviewQuery = {}): string => abs(`/review/${traceId}`, q),
  judges: (): string => abs('/judges'),
  judge: (name: string): string => abs(`/judges/${name}`),
  judgeVersion: (name: string, n: number): string => abs(`/judges/${name}/versions/${n}`),
  judgeDisagreements: (name: string, version: number): string => abs(`/judges/${name}/disagreements`, { version }),
  alerts: (): string => abs('/alerts'),
  alertDeliveries: (id: string): string => abs(`/alerts/${id}/deliveries`),
  query: (sql: string): string => abs('/query', { sql }),
};
