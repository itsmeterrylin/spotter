import type { Calibration, Judge, JudgeVersion } from '../db/repos/judge.ts';
import type { Repos } from '../db/repos/index.ts';
import type { CreatedBy, Json, JsonObject, JudgeScope } from '../db/types.ts';
import { invalid, notFound } from '../errors.ts';
import { urls } from '../urls.ts';

export type VersionView = JudgeVersion & { calibration: Calibration[]; active: boolean; calibrated: boolean; url: string };
export type JudgeStatus = 'calibrated' | 'needs_labels' | 'pending';
export type JudgeView = Judge & { active_version: number | null; status: JudgeStatus; labels: number; versions: VersionView[]; url: string };
export type JudgeRow = Omit<JudgeView, 'versions'> & { version_count: number; disagreements: number; disagreements_url: string | null };

export type ProposeInput = {
  name: string;
  from_version?: number | null;
  prompt?: string;
  model?: string;
  params?: JsonObject | null;
  examples?: Json | null;
  scope?: JudgeScope;
  note?: string | null;
  created_by: CreatedBy;
};

export const calibrationBar = 0.9;
export const labelTarget = 100;

export const isCalibrated = (cals: Calibration[]): boolean => cals.some((c) => c.split === 'test' && c.tpr >= calibrationBar && c.tnr >= calibrationBar);

const stable = (value: Json | null | undefined): string => {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

export const contentHash = (def: { scope: JudgeScope; prompt: string; model: string; params: JsonObject | null; examples: Json | null }): string =>
  new Bun.CryptoHasher('sha256').update(stable({ scope: def.scope, prompt: def.prompt, model: def.model, params: def.params, examples: def.examples })).digest('hex');

const versionView = (repos: Repos, judge: Judge, v: JudgeVersion): VersionView => {
  const calibration = repos.judges.calibrations(v.id);
  return { ...v, calibration, active: v.id === judge.active_version_id, calibrated: isCalibrated(calibration), url: urls.judgeVersion(judge.name, v.number) };
};

const statusOf = (versions: VersionView[], judge: Judge): JudgeStatus => {
  const active = versions.find((v) => v.id === judge.active_version_id);
  if (!active) return 'needs_labels';
  if (active.calibrated) return 'calibrated';
  return active.calibration.length ? 'pending' : 'needs_labels';
};

export function judgeView(repos: Repos, judge: Judge): JudgeView {
  const versions = repos.judges
    .versions(judge.name)
    .map((v) => versionView(repos, judge, v))
    .reverse();
  const active = versions.find((v) => v.active);
  return { ...judge, active_version: active?.number ?? null, status: statusOf(versions, judge), labels: repos.judges.labelCount(judge.name), versions, url: urls.judge(judge.name) };
}

export function getJudge(repos: Repos, name: string): JudgeView {
  const judge = repos.judges.get(name);
  if (!judge) throw notFound('judge', name);
  return judgeView(repos, judge);
}

export function requireVersion(repos: Repos, name: string, number: number | 'active'): { judge: Judge; version: JudgeVersion } {
  const judge = repos.judges.get(name);
  if (!judge) throw notFound('judge', name);
  const version = number === 'active' ? (judge.active_version_id ? repos.judges.getVersion(judge.active_version_id) : null) : repos.judges.getVersionByNumber(name, number);
  if (!version) throw notFound(`judge ${name} version`, String(number));
  return { judge, version };
}

export const disagreementCount = (repos: Repos, versionId: string): number => repos.judges.pairs(versionId).filter((p) => p.human >= 0.5 !== p.judge >= 0.5).length;

export function listJudges(repos: Repos): { judges: JudgeRow[]; url: string } {
  const judges = repos.judges.list().map((judge) => {
    const { versions, ...rest } = judgeView(repos, judge);
    const active = versions.find((v) => v.active);
    return {
      ...rest,
      version_count: versions.length,
      disagreements: active ? disagreementCount(repos, active.id) : 0,
      disagreements_url: active ? urls.judgeDisagreements(judge.name, active.number) : null,
    };
  });
  return { judges, url: urls.judges() };
}

export function propose(repos: Repos, input: ProposeInput): { version: VersionView; existing: boolean; judge: JudgeView } {
  const held = repos.judges.get(input.name);
  const versions = held ? repos.judges.versions(input.name) : [];
  const base = input.from_version === undefined || input.from_version === null ? (versions.find((v) => v.id === held?.active_version_id) ?? versions[versions.length - 1] ?? null) : (versions.find((v) => v.number === input.from_version) ?? null);
  if (input.from_version !== undefined && input.from_version !== null && !base) throw notFound(`judge ${input.name} version`, String(input.from_version));
  const prompt = input.prompt ?? base?.prompt;
  const model = input.model ?? base?.model;
  if (prompt === undefined || model === undefined) throw invalid('a first version needs prompt and model');
  const def = { scope: input.scope ?? base?.scope ?? 'transcript', prompt, model, params: input.params === undefined ? (base?.params ?? null) : input.params, examples: input.examples === undefined ? (base?.examples ?? null) : input.examples };
  const hash = contentHash(def);
  const judge = repos.judges.ensure(input.name);
  const same = repos.judges.getVersionByHash(input.name, hash);
  if (same) return { version: versionView(repos, judge, same), existing: true, judge: judgeView(repos, judge) };
  const number = (versions[versions.length - 1]?.number ?? 0) + 1;
  const version = repos.tx(() => {
    const created = repos.judges.createVersion({ ...def, judge_name: input.name, number, parent_id: base?.id ?? null, content_hash: hash, created_by: input.created_by, note: input.note ?? null });
    if (number === 1) repos.judges.activate(input.name, created.id);
    return created;
  });
  const fresh = repos.judges.get(input.name) ?? judge;
  return { version: versionView(repos, fresh, version), existing: false, judge: judgeView(repos, fresh) };
}

export function activate(repos: Repos, name: string, number: number): JudgeView {
  const { judge, version } = requireVersion(repos, name, number);
  const previous = judge.active_version_id ? repos.judges.getVersion(judge.active_version_id) : null;
  if (previous?.id === version.id) return judgeView(repos, judge);
  const line = `activated ${new Date().toISOString()}${previous ? `; previous v${previous.number}` : ''}`;
  repos.tx(() => {
    repos.judges.activate(name, version.id);
    repos.judges.setNote(version.id, version.note ? `${version.note}\n${line}` : line);
  });
  return getJudge(repos, name);
}
