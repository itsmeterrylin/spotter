export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export type EvalItem<I = Json, E = Json> = { id: string; input: I; expected: E | null; metadata: JsonObject | null };

export type ItemInput<I = Json, E = Json> = { id: string; input: I; expected?: E | null; metadata?: JsonObject | null; tags?: string[] | null };

export type ScoreResult = { name: string; value: number; label?: string | null; reason?: string | null };

export type Task<I, E, O> = (item: EvalItem<I, E>) => Promise<O> | O;
export type Scorer<I, E, O> = (item: EvalItem<I, E>, output: O) => Promise<ScoreResult> | ScoreResult;

export type EvalConfig<I, E, O> = {
  dataset: string;
  project?: string;
  metadata?: JsonObject;
  task: Task<I, E, O>;
  scores: Scorer<I, E, O>[];
};

export type EvalDefinition = {
  dataset: string;
  project: string;
  metadata: JsonObject;
  task: (item: EvalItem) => Promise<unknown>;
  scores: ((item: EvalItem, output: unknown) => Promise<ScoreResult>)[];
};

export const defaultProject = 'default';

export function defineEval<I, E, O>(config: EvalConfig<I, E, O>): EvalDefinition {
  const typed = (item: EvalItem): EvalItem<I, E> => item as EvalItem<I, E>;
  return {
    dataset: config.dataset,
    project: config.project ?? defaultProject,
    metadata: config.metadata ?? {},
    task: async (item) => config.task(typed(item)),
    scores: config.scores.map((score) => async (item, output) => score(typed(item), output as O)),
  };
}

export const isEvalDefinition = (value: unknown): value is EvalDefinition =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as EvalDefinition).dataset === 'string' &&
  typeof (value as EvalDefinition).task === 'function' &&
  Array.isArray((value as EvalDefinition).scores);

export { uuid7 } from './uuid7.ts';
export { runEval } from './runner.ts';
export type { RunOptions, RunReport } from './runner.ts';
export { formatSummary } from './summary.ts';
export type { ScoreSummary, SummaryView } from './summary.ts';
