export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export type ScoreSource = 'sdk' | 'judge' | 'human';
export type DatasetPurpose = 'eval' | 'judge_labels';
export type JudgeScope = 'turn' | 'transcript';
export type CreatedBy = 'human' | 'agent';
export type Split = 'dev' | 'test';

export type Metrics = JsonObject & {
  prompt_tokens?: number;
  completion_tokens?: number;
  duration_ms?: number;
  errors?: number;
};

export type Message = { turn: number; role: string; content: Json; metadata?: JsonObject };
export type TraceEvent = { at: string; name: string; data?: Json };
