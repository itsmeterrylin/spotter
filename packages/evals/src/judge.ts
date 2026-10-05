import type { Json, JsonObject } from './index.ts';

export type JudgeContext = { input: Json | null; output: Json | null; expected: Json | null; examples: Json | null; transcript?: Json | null };
export type Verdict = { pass: boolean; reason: string };
export type JudgeModel = { name: string; complete: (prompt: string, ctx: JudgeContext) => Promise<string> };
export type JudgeVersionDef = { id: string; number: number; scope?: 'turn' | 'transcript'; prompt: string; model: string; params: JsonObject | null; examples: Json | null };

export const defaultBaseUrl = 'https://openrouter.ai/api/v1';

const text = (value: Json | null): string => (typeof value === 'string' ? value : value === null ? '' : JSON.stringify(value, null, 2));

export const renderPrompt = (template: string, ctx: JudgeContext): string =>
  template.replace(/\{\{\s*(input|output|expected|examples|transcript)\s*\}\}/g, (_, key: keyof JudgeContext) => text(ctx[key] ?? null));

function firstObject(source: string): string | null {
  const start = source.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let quoted = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '\\') i += 1;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

export function parseVerdict(source: string): Verdict {
  const chunk = firstObject(source);
  if (!chunk) throw new Error(`judge answer has no JSON object: ${source.slice(0, 120)}`);
  const parsed = JSON.parse(chunk) as { pass?: unknown; reason?: unknown };
  if (typeof parsed.pass !== 'boolean') throw new Error(`judge answer has no boolean pass: ${chunk.slice(0, 120)}`);
  return { pass: parsed.pass, reason: typeof parsed.reason === 'string' ? parsed.reason : '' };
}

const expectedText = (expected: Json | null): string => {
  if (typeof expected === 'object' && expected !== null && !Array.isArray(expected) && typeof expected.exercise === 'string') return expected.exercise;
  return text(expected);
};

const fakes: Record<string, (ctx: JudgeContext) => Verdict> = {
  contains: (ctx) => {
    const needle = expectedText(ctx.expected);
    const pass = needle !== '' && text(ctx.output).toLowerCase().includes(needle.toLowerCase());
    return { pass, reason: pass ? `output contains ${needle}` : `output lacks ${needle}` };
  },
};

export function fakeModel(name: string): JudgeModel {
  const rule = fakes[name];
  if (!rule) throw new Error(`unknown fake judge model fake:${name}; known: ${Object.keys(fakes).join(', ')}`);
  return { name: `fake:${name}`, complete: async (_prompt, ctx) => JSON.stringify(rule(ctx)) };
}

type ChatResponse = { choices?: { message?: { content?: unknown } }[]; error?: { message?: unknown } };

export function openAiModel(model: string, params: JsonObject | null, env: Record<string, string | undefined>): JudgeModel {
  const key = env.SPOTTER_JUDGE_API_KEY;
  if (!key) throw new Error(`model ${model} needs SPOTTER_JUDGE_API_KEY (or use a fake: model)`);
  const base = (env.SPOTTER_JUDGE_BASE_URL ?? defaultBaseUrl).replace(/\/$/, '');
  return {
    name: model,
    complete: async (prompt) => {
      const body = JSON.stringify({ ...params, model, messages: [{ role: 'user', content: prompt }] });
      let res: Response;
      try {
        res = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Title': 'Spotter', authorization: `Bearer ${key}` }, body });
      } catch (err) {
        throw new Error(`cannot reach ${base}: ${err instanceof Error ? err.message : String(err)}`);
      }
      const data = (await res.json()) as ChatResponse;
      if (!res.ok) throw new Error(`${base} answered ${res.status}: ${typeof data.error?.message === 'string' ? data.error.message : 'no message'}`);
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error(`${base} answered without message content`);
      return content;
    },
  };
}

export const modelFor = (version: JudgeVersionDef, env: Record<string, string | undefined> = process.env): JudgeModel =>
  version.model.startsWith('fake:') ? fakeModel(version.model.slice('fake:'.length)) : openAiModel(version.model, version.params, env);

export async function judgeOne(model: JudgeModel, version: JudgeVersionDef, ctx: JudgeContext): Promise<Verdict> {
  return parseVerdict(await model.complete(renderPrompt(version.prompt, ctx), ctx));
}
