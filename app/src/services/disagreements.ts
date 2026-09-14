import type { LabelPair } from '../db/repos/judge.ts';
import type { Repos } from '../db/repos/index.ts';
import type { Json } from '../db/types.ts';
import { urls } from '../urls.ts';
import { requireVersion } from './judges.ts';

export type Disagreement = {
  trace_id: string;
  run_id: string | null;
  name: string;
  turn: number | null;
  input: Json | null;
  output: Json | null;
  expected: Json | null;
  human: { value: number; note: string | null };
  judge: { value: number; reason: string | null };
  url: string;
};

export type DisagreementList = { judge: string; version: number; judge_version_id: string; traces: Disagreement[]; url: string };

const differs = (p: LabelPair): boolean => p.human >= 0.5 !== p.judge >= 0.5;

export const disagreementIds = (repos: Repos, versionId: string): string[] => [...new Set(repos.judges.pairs(versionId).filter(differs).map((p) => p.trace_id))];

const row = (repos: Repos, judgeName: string, number: number, p: LabelPair): Disagreement => {
  const trace = repos.traces.get(p.trace_id);
  return {
    trace_id: p.trace_id,
    run_id: trace?.run_id ?? null,
    name: p.name,
    turn: p.turn,
    input: trace?.input ?? null,
    output: trace?.output ?? null,
    expected: trace?.expected ?? null,
    human: { value: p.human, note: p.human_note },
    judge: { value: p.judge, reason: p.judge_reason },
    url: urls.reviewTrace(p.trace_id, { run: trace?.run_id, judge: judgeName, version: number }),
  };
};

export function disagreements(repos: Repos, name: string, number: number | 'active'): DisagreementList {
  const { version } = requireVersion(repos, name, number);
  const traces = repos.judges
    .pairs(version.id)
    .filter(differs)
    .map((p) => row(repos, name, version.number, p));
  return { judge: name, version: version.number, judge_version_id: version.id, traces, url: urls.judgeDisagreements(name, version.number) };
}
