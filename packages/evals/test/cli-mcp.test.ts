import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../../app/src/app.ts';
import { openDatabase } from '../../../app/src/db/client.ts';
import { mountMcp } from '../../../app/src/mcp/index.ts';
import { parseArgs } from '../src/cli.ts';
import { isMcpCompare, parseRpcBody } from '../src/mcp.ts';

const root = new URL('../../../', import.meta.url).pathname;
const cli = join(root, 'packages/evals/src/cli.ts');

let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  const db = openDatabase(':memory:');
  const app = createApp(db);
  mountMcp(app, db);
  server = Bun.serve({ port: 0, fetch: app.fetch });
});
afterAll(() => server.stop(true));

async function spotter(args: string[], stdin?: string): Promise<{ code: number; out: string; err: string }> {
  const proc = Bun.spawn(['bun', cli, ...args], {
    cwd: root,
    env: { ...process.env, SPOTTER_URL: `http://127.0.0.1:${server.port}` },
    stdin: stdin === undefined ? 'ignore' : new Blob([stdin]),
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { code, out, err };
}

describe('spotter list, read, write, compare forward to MCP', () => {
  test('write dataset.create from stdin, then list datasets shows it with a url', async () => {
    const made = await spotter(['write', 'dataset.create', '--data', '-', '--json'], JSON.stringify({ project: 'copper', name: 'cli-golden' }));
    expect(made.code).toBe(0);
    const created = JSON.parse(made.out) as { ok: boolean; ids: string[]; url: string };
    expect(created.ok).toBe(true);

    const listed = await spotter(['list', 'datasets', '--limit', '5']);
    expect(listed.code).toBe(0);
    const body = JSON.parse(listed.out) as { items: Array<{ id: string; name: string; url: string }> };
    expect(body.items.map((d) => d.name)).toEqual(['cli-golden']);
    expect(body.items[0]?.url).toContain(created.ids[0] ?? 'missing');
    expect(listed.out).toContain('\n  ');
  });

  test('read forwards the id and --json prints compact output', async () => {
    const listed = JSON.parse((await spotter(['list', 'datasets', '--json'])).out) as { items: Array<{ id: string }> };
    const read = await spotter(['read', 'dataset', listed.items[0]?.id ?? '', '--json']);
    expect(read.code).toBe(0);
    expect(read.out.trim().split('\n')).toHaveLength(1);
    expect((JSON.parse(read.out) as { name: string }).name).toBe('cli-golden');
  });

  test('an unknown write op exits non-zero with the server message, not a parse error', async () => {
    const { code, err } = await spotter(['write', 'nope.op', '--data', '{}']);
    expect(code).toBe(1);
    expect(err).not.toContain('JSON Parse error');
    expect(err).toContain('Invalid option');
    expect(err).toContain('issues.upsert');
  });

  test('an MCP error exits non-zero and prints the error on stderr', async () => {
    const { code, err } = await spotter(['read', 'run', 'no-such-run']);
    expect(code).toBe(1);
    expect(err).toContain('not_found');
  });

  test('write accepts @file.json and --dry-run does not write', async () => {
    const file = join(tmpdir(), `cli-mcp-${process.pid}.json`);
    await Bun.write(file, JSON.stringify({ project: 'copper', name: 'never-created' }));
    const dry = await spotter(['write', 'dataset.create', '--data', `@${file}`, '--dry-run', '--json']);
    expect(JSON.parse(dry.out)).toEqual({ ok: true, dry_run: true, op: 'dataset.create' });
    const listed = JSON.parse((await spotter(['list', 'datasets', '--json'])).out) as { items: Array<{ name: string }> };
    expect(listed.items.map((d) => d.name)).not.toContain('never-created');
  });

  test('compare with a comma list takes the MCP path', async () => {
    const { code, err } = await spotter(['compare', 'no-dataset', 'a,b']);
    expect(code).toBe(1);
    expect(err).toContain('not_found');
  });
});

describe('argument rules', () => {
  test('compare path selection', () => {
    expect(isMcpCompare(['compare', 'runA', 'runB'])).toBe(false);
    expect(isMcpCompare(['compare', 'ds', 'a,b'])).toBe(true);
    expect(isMcpCompare(['compare', 'ds', 'a', 'b'])).toBe(true);
  });

  test('boolean flags do not swallow the next positional', () => {
    expect(parseArgs(['--json', 'list', 'runs'])).toEqual({ positional: ['list', 'runs'], flags: { json: true } });
  });

  test('parses plain JSON and SSE bodies', () => {
    expect(parseRpcBody('{"a":1}')).toEqual({ a: 1 });
    expect(parseRpcBody('event: message\ndata: {"a":2}\n')).toEqual({ a: 2 });
  });
});
