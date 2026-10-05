import { createClient, type ApiClient, type ClientConfig } from './client.ts';
import type { Json } from './index.ts';
import { judgeOne, modelFor, type JudgeModel, type JudgeVersionDef, type Verdict } from './judge.ts';

export type JudgeTarget = { run?: string; dataset?: string };
export type JudgeRunOptions = { name: string; version: string; target: JudgeTarget; client: ClientConfig; env?: Record<string, string | undefined>; model?: JudgeModel };
export type JudgeRunReport = { judge: string; version: number; model: string; scored: number; pass: number; fail: number; url: string; dataset_id: string | null };

type Message = { turn: number; role: string; content: Json };
type TraceBody = { id: string; input: Json | null; output: Json | null; expected: Json | null; messages: Message[] | null };
type ScoreBody = { name: string; value: number; label: string; reason: string | null; source: 'judge'; judge_version_id: string; turn: number | null };
type TracePage = { traces: TraceBody[]; next_cursor: string | null };
type JudgeBody = { name: string; url: string; versions: (JudgeVersionDef & { active: boolean })[] };

const pageSize = 500;
const concurrency = 4;

export async function resolveVersion(client: ApiClient, name: string, version: string): Promise<{ def: JudgeVersionDef; url: string }> {
  const judge = (await client.get(`/api/judges/${encodeURIComponent(name)}`)) as JudgeBody;
  const def = version === 'active' ? judge.versions.find((v) => v.active) : judge.versions.find((v) => v.number === Number(version));
  if (!def) throw new Error(`judge ${name} has no ${version === 'active' ? 'active version' : `version ${version}`}`);
  return { def, url: judge.url };
}

async function tracesOfRun(client: ApiClient, runId: string): Promise<TraceBody[]> {
  const out: TraceBody[] = [];
  let cursor: string | null = null;
  do {
    const page = (await client.get(`/api/traces?run_id=${encodeURIComponent(runId)}&limit=${pageSize}${cursor ? `&cursor=${cursor}` : ''}`)) as TracePage;
    out.push(...page.traces);
    cursor = page.next_cursor;
  } while (cursor);
  return out;
}

async function tracesOfDataset(client: ApiClient, datasetId: string): Promise<TraceBody[]> {
  const list = (await client.get(`/api/datasets/${encodeURIComponent(datasetId)}/items`)) as { items: { source_trace_id: string | null }[] };
  const ids = list.items.map((i) => i.source_trace_id).filter((id): id is string => typeof id === 'string');
  return Promise.all(ids.map((id) => client.get(`/api/traces/${id}`) as Promise<TraceBody>));
}

async function eachTrace(traces: TraceBody[], fn: (t: TraceBody) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < traces.length) {
      const trace = traces[next];
      next += 1;
      if (trace) await fn(trace);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, traces.length) }, worker));
}

const toScore = (name: string, def: JudgeVersionDef, verdict: Verdict, turn: number | null): ScoreBody => ({
  name,
  value: verdict.pass ? 1 : 0,
  label: verdict.pass ? 'pass' : 'fail',
  reason: verdict.reason || null,
  source: 'judge',
  judge_version_id: def.id,
  turn,
});

async function judgeTrace(model: JudgeModel, def: JudgeVersionDef, name: string, trace: TraceBody): Promise<ScoreBody[]> {
  const base = { input: trace.input, expected: trace.expected, examples: def.examples };
  const messages = trace.messages ?? [];
  if (def.scope !== 'turn' || messages.length === 0) {
    return [toScore(name, def, await judgeOne(model, def, { ...base, output: trace.output, transcript: trace.messages }), null)];
  }
  const out: ScoreBody[] = [];
  for (const [i, m] of messages.entries()) {
    if (m.role !== 'assistant') continue;
    const verdict = await judgeOne(model, def, { ...base, output: m.content, transcript: messages.slice(0, i + 1) });
    out.push(toScore(name, def, verdict, m.turn));
  }
  return out;
}

export async function judgeRun(options: JudgeRunOptions): Promise<JudgeRunReport> {
  if (!options.target.run && !options.target.dataset) throw new Error('judge run needs --run <run_id> or --dataset <id>');
  const client = createClient(options.client);
  const { def, url } = await resolveVersion(client, options.name, options.version);
  const model = options.model ?? modelFor(def, options.env ?? process.env);
  const traces = options.target.run ? await tracesOfRun(client, options.target.run) : await tracesOfDataset(client, options.target.dataset ?? '');
  let pass = 0;
  let scored = 0;
  await eachTrace(traces, async (trace) => {
    const scores = await judgeTrace(model, def, options.name, trace);
    scored += scores.length;
    pass += scores.filter((s) => s.value === 1).length;
    await client.put(`/api/traces/${trace.id}/scores`, { scores });
  });
  return { judge: options.name, version: def.number, model: model.name, scored, pass, fail: scored - pass, url, dataset_id: options.target.dataset ?? null };
}

export const formatJudgeRun = (r: JudgeRunReport): string =>
  [`judge ${r.judge} v${r.version} (${r.model})`, `scored ${r.scored}: ${r.pass} pass, ${r.fail} fail`, '', `judge    ${r.url}`].join('\n');
