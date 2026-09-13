#!/usr/bin/env bun
import { configFromEnv } from './client.ts';
import { init } from './init.ts';
import { loadEval } from './load.ts';
import { compareRuns, runEval } from './runner.ts';
import { formatSummary } from './summary.ts';

export type Parsed = { positional: string[]; flags: Record<string, string | true> };

const usage = `usage:
  spotter run <file> [--baseline <run_id>] [--no-send] [--create]
  spotter compare <baseline_run_id> <run_id>
  spotter init`;

export function parseArgs(argv: string[]): Parsed {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[arg.slice(2)] = next;
      i += 1;
    } else flags[arg.slice(2)] = true;
  }
  return { positional, flags };
}

const flagString = (flags: Parsed['flags'], name: string): string | undefined => (typeof flags[name] === 'string' ? flags[name] : undefined);

export async function runCommand(file: string, flags: Parsed['flags']): Promise<string> {
  const loaded = await loadEval(file);
  const report = await runEval(loaded.def, loaded.items, {
    name: loaded.name,
    send: flags['no-send'] !== true,
    create: flags.create === true,
    baseline: flagString(flags, 'baseline'),
    client: configFromEnv(),
  });
  return formatSummary(report.summary, report);
}

export async function compareCommand(baseline: string, current: string): Promise<string> {
  const summary = await compareRuns(configFromEnv(), baseline, current);
  return formatSummary(summary, { run_url: null, compare_url: summary.url, compare_note: null });
}

export async function main(argv: string[]): Promise<number> {
  const { positional, flags } = parseArgs(argv);
  const [command, a, b] = positional;
  if (command === 'run' && a) {
    console.log(await runCommand(a, flags));
    return 0;
  }
  if (command === 'compare' && a && b) {
    console.log(await compareCommand(a, b));
    return 0;
  }
  if (command === 'init') {
    console.log(await init());
    return 0;
  }
  console.error(usage);
  return 2;
}

if (import.meta.main) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    },
  );
}
