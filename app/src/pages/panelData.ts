import type { Repos } from '../db/repos/index.ts';
import type { Dataset, DatasetItem } from '../db/repos/dataset.ts';
import type { IssueRow } from '../db/repos/issue.ts';
import type { Run } from '../db/repos/run.ts';
import { notFound } from '../errors.ts';
import { getDataset } from '../services/datasets.ts';
import { disagreements } from '../services/disagreements.ts';
import { getIssue, issuesForJudge, type IssueView } from '../services/issues.ts';
import { disagreementCount, getJudge, type JudgeView, type VersionView } from '../services/judges.ts';
import { getTrace, type TraceView } from '../services/traces.ts';
import { humanVerdict, type HumanVerdict, type RunCard, runCard } from './data.ts';

/** What a peek or a detail page shows a right panel for. One variant per object kind. */
export type PeekRef =
  | { kind: 'issue'; id: string }
  | { kind: 'trace'; id: string }
  | { kind: 'judge'; name: string }
  | { kind: 'version'; name: string; number: number }
  | { kind: 'run'; id: string }
  | { kind: 'dataset'; id: string }
  | { kind: 'item'; dataset: string; id: string };

export type PeekKind = PeekRef['kind'];

/** The path of an object's peek fragment. Every kind answers at `<object path>/pane`. */
export const peekPath = (ref: PeekRef): string => {
  switch (ref.kind) {
    case 'issue': return `/issues/${ref.id}/pane`;
    case 'trace': return `/traces/${ref.id}/pane`;
    case 'judge': return `/judges/${ref.name}/pane`;
    case 'version': return `/judges/${ref.name}/versions/${ref.number}/pane`;
    case 'run': return `/runs/${ref.id}/pane`;
    case 'dataset': return `/datasets/${ref.id}/pane`;
    case 'item': return `/datasets/${ref.dataset}/items/${ref.id}/pane`;
  }
};

/** The value `?peek=` carries for this object. */
export const peekId = (ref: PeekRef): string => (ref.kind === 'judge' ? ref.name : ref.kind === 'version' ? String(ref.number) : ref.id);

/** Where the queue stands on a review page. `index` is null once the trace has left the queue. */
export type ReviewState = { index: number | null; total: number; next: string | null; prev: string | null; focus: boolean; source: string | null };

export type PanelData =
  | { kind: 'issue'; issue: IssueView; projectTraces: number }
  | { kind: 'trace'; trace: TraceView; run: Run | null; verdict: HumanVerdict | null; issues: IssueRow[]; review?: ReviewState }
  | { kind: 'judge'; judge: JudgeView; disagreements: number; openIssues: number }
  | { kind: 'version'; judge: JudgeView; version: VersionView; disagreements: number }
  | { kind: 'run'; card: RunCard; traces: number }
  | { kind: 'dataset'; dataset: Dataset; items: number; cards: RunCard[]; sourceTraces: number }
  | { kind: 'item'; dataset: Dataset; item: DatasetItem };

export const loadPanel = (repos: Repos, ref: PeekRef, extra: { score?: string; review?: ReviewState } = {}): PanelData => {
  switch (ref.kind) {
    case 'issue': {
      const issue = getIssue(repos, ref.id);
      return { kind: 'issue', issue, projectTraces: repos.traces.count(issue.project_id) };
    }
    case 'trace': {
      const trace = getTrace(repos, ref.id);
      return { kind: 'trace', trace, run: trace.run_id ? repos.runs.get(trace.run_id) : null, verdict: humanVerdict(trace.scores), issues: repos.issues.listByTrace(trace.id), review: extra.review };
    }
    case 'judge': {
      const judge = getJudge(repos, ref.name);
      const found = judge.active_version_id ? disagreements(repos, judge.name, 'active').traces.length : 0;
      return { kind: 'judge', judge, disagreements: found, openIssues: issuesForJudge(repos, judge.name).filter((i) => i.status === 'open').length };
    }
    case 'version': {
      const judge = getJudge(repos, ref.name);
      const version = judge.versions.find((v) => v.number === ref.number);
      if (!version) throw notFound(`judge ${judge.name} version`, String(ref.number));
      return { kind: 'version', judge, version, disagreements: disagreementCount(repos, version.id) };
    }
    case 'run': {
      const run = repos.runs.get(ref.id);
      if (!run) throw notFound('run', ref.id);
      const traces = repos.traces.listByRun(run.id);
      return { kind: 'run', card: runCard(repos, run, extra.score), traces: traces.length };
    }
    case 'dataset': {
      const dataset = getDataset(repos, ref.id);
      return {
        kind: 'dataset',
        dataset,
        items: dataset.item_count,
        cards: repos.runs.list(dataset.id).map((r) => runCard(repos, r)),
        sourceTraces: repos.datasets.itemsBySourceTrace(dataset.id).size,
      };
    }
    case 'item': {
      const dataset = getDataset(repos, ref.dataset);
      const item = repos.datasets.getItem(ref.id);
      if (!item || item.dataset_id !== dataset.id) throw notFound('dataset item', ref.id);
      return { kind: 'item', dataset, item };
    }
  }
};
