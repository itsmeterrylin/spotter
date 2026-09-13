import { StreamableHTTPTransport } from '@hono/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Database } from 'bun:sqlite';
import type { Hono } from 'hono';
import { ZodError, z } from 'zod';
import pkg from '../../package.json' with { type: 'json' };
import { createRepos, type Repos } from '../db/repos/index.ts';
import { ApiError } from '../errors.ts';
import { compare } from '../services/compare.ts';
import { summary } from '../services/summary.ts';
import { list } from './list.ts';
import { read } from './read.ts';
import { fail, ok, type ToolResult } from './result.ts';
import { compareArgs, listArgs, readArgs, writeArgs, type CompareArgs } from './schemas.ts';
import { write } from './write.ts';

const guard = (fn: () => ToolResult): CallToolResult => {
  try {
    return ok(fn());
  } catch (err) {
    if (err instanceof ApiError) return fail(err.code, err.message);
    if (err instanceof ZodError) return fail('invalid', z.prettifyError(err));
    throw err;
  }
};

const compareRuns = (repos: Repos, args: CompareArgs): ToolResult => {
  const result = compare(repos, args.dataset_id, args.run_ids, args.only);
  const first = args.run_ids[0] ?? '';
  const last = args.run_ids[args.run_ids.length - 1] ?? '';
  const versus = summary(repos, last, first);
  const scores = Object.fromEntries(
    Object.entries(result.summary).map(([name, s]) => [name, { ...s, improvements: versus.scores[name]?.improvements ?? 0, regressions: versus.scores[name]?.regressions ?? 0 }]),
  );
  return { ...result, summary: scores };
};

const descriptions = {
  list: 'List datasets, items, runs, traces, or notes (human scores with a reason). Rows carry url. judges, disagreements, alerts, deliveries arrive in later phases.',
  read: 'Read one run (with aggregates), trace (with scores), dataset (with item count and runs), or the audit counts. Result carries url.',
  write:
    'Write through the same validation as REST: dataset.create, items.upsert {dataset_id, items}, run.create, traces.insert {traces}, trace.patch_metadata {trace_id, metadata?, events?}, scores.put {trace_id, scores}. dry_run validates only.',
  compare: 'Compare two or more runs on one dataset: per-item cells, per-score means, diff, improvements, regressions, and the compare page url.',
};

export function createMcpServer(repos: Repos): McpServer {
  const server = new McpServer({ name: 'spotter', version: pkg.version });
  server.registerTool('list', { description: descriptions.list, inputSchema: listArgs }, (args) => guard(() => list(repos, args)));
  server.registerTool('read', { description: descriptions.read, inputSchema: readArgs }, (args) => guard(() => read(repos, args)));
  server.registerTool('write', { description: descriptions.write, inputSchema: writeArgs }, (args) => guard(() => write(repos, args)));
  server.registerTool('compare', { description: descriptions.compare, inputSchema: compareArgs }, (args) => guard(() => compareRuns(repos, args)));
  return server;
}

// One server and transport per request: the transport keys in-flight requests by JSON-RPC id and never
// frees them in JSON mode, so two clients sharing one transport would collide or leak.
export function mountMcp(app: Hono, db: Database): void {
  const repos = createRepos(db);
  app.all('/mcp', async (c) => {
    const transport = new StreamableHTTPTransport({ enableJsonResponse: true });
    await createMcpServer(repos).connect(transport);
    return transport.handleRequest(c);
  });
}
