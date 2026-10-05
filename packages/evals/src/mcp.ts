import type { ClientConfig } from './client.ts';

export type ToolOutcome = { isError: boolean; result: unknown };

type Flags = Record<string, string | true>;

const flag = (flags: Flags, name: string): string | undefined => (typeof flags[name] === 'string' ? flags[name] : undefined);

/** Streamable HTTP answers with plain JSON or a single SSE `data:` line. */
export function parseRpcBody(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
  const data = trimmed.split('\n').find((line) => line.startsWith('data:'));
  if (!data) throw new Error(`unreadable MCP response: ${trimmed.slice(0, 200)}`);
  return JSON.parse(data.slice(5).trim());
}

// Input-validation failures come back as plain text, not JSON.
const parseToolText = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return { error: { message: raw } };
  }
};

type ToolPayload = { isError?: boolean; structuredContent?: unknown; content?: Array<{ text?: string }> };

export async function callTool(config: ClientConfig, name: string, args: Record<string, unknown>): Promise<ToolOutcome> {
  const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  if (config.token) headers.authorization = `Bearer ${config.token}`;
  let res: Response;
  try {
    res = await fetch(`${config.url}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) });
  } catch (err) {
    throw new Error(`cannot reach spotter at ${config.url}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`POST /mcp failed with ${res.status}: ${text}`);
  const rpc = parseRpcBody(text) as { error?: { message?: string }; result?: ToolPayload };
  if (rpc.error) throw new Error(`MCP error: ${rpc.error.message ?? 'unknown'}`);
  const payload = rpc.result ?? {};
  const raw = payload.content?.[0]?.text;
  const result = payload.structuredContent ?? (raw === undefined ? null : parseToolText(raw));
  return { isError: payload.isError === true, result };
}

const num = (value: string | undefined, name: string): number | undefined => {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`--${name} must be an integer, got ${value}`);
  return n;
};

const defined = (o: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export function listArgs(type: string, flags: Flags): Record<string, unknown> {
  const filters = flag(flags, 'filters');
  return defined({
    type,
    status: flag(flags, 'status'),
    project: flag(flags, 'project'),
    judge: flag(flags, 'judge'),
    version: num(flag(flags, 'version'), 'version'),
    run_id: flag(flags, 'run'),
    dataset_id: flag(flags, 'dataset'),
    limit: num(flag(flags, 'limit'), 'limit'),
    filters: filters === undefined ? undefined : JSON.parse(filters),
  });
}

export const readArgs = (type: string, id: string | undefined, flags: Flags): Record<string, unknown> => defined({ type, id, version: num(flag(flags, 'version'), 'version') });

export async function parseData(spec: string | undefined, readStdin: () => Promise<string> = () => Bun.stdin.text()): Promise<Record<string, unknown>> {
  if (spec === undefined) throw new Error('--data is required: a JSON object, @file.json, or - for stdin');
  const text = spec === '-' ? await readStdin() : spec.startsWith('@') ? await Bun.file(spec.slice(1)).text() : spec;
  const data: unknown = JSON.parse(text);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('--data must be a JSON object');
  return data as Record<string, unknown>;
}

export async function writeArgs(op: string, flags: Flags): Promise<Record<string, unknown>> {
  return { op, data: await parseData(flag(flags, 'data')), dry_run: flags['dry-run'] === true };
}

export function compareArgs(datasetId: string, runs: string, flags: Flags): Record<string, unknown> {
  return defined({ dataset_id: datasetId, run_ids: runs.split(',').filter(Boolean), only: flag(flags, 'only') });
}

/** positional[0] is `compare`. Legacy `compare <baseline> <run>` has exactly two ids and no comma; a comma in the second argument or a third id selects the MCP path `compare <dataset> <run,run,...>`. */
export const isMcpCompare = (positional: string[]): boolean => positional.length >= 4 || (positional[2] ?? '').includes(',');

export function formatOutcome(outcome: ToolOutcome, flags: Flags): string {
  return flags.json === true ? JSON.stringify(outcome.result) : JSON.stringify(outcome.result, null, 2);
}
