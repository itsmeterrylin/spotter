import { realpathSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { configFromEnv } from './client.ts';
import { loadEval } from './load.ts';
import { runEval } from './runner.ts';
import { formatSummary } from './summary.ts';

export type InitAnswers = { dataset: string; taskFile: string; scoreNames: string[] };

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const relativeImport = (from: string, to: string): string => {
  const rel = relative(dirname(from), to).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
};

export function askAnswers(ask: (question: string) => string | null = (q) => prompt(q)): InitAnswers {
  const dataset = ask('Dataset name (for example tagging-golden):')?.trim() ?? '';
  if (!dataset) throw new Error('a dataset name is required');
  const taskFile = ask('Path to the task file (must export `task(item)`):')?.trim() ?? '';
  if (!taskFile) throw new Error('a task file path is required');
  const names = ask('Score names, comma separated (for example exercise_match, weight_found):')?.trim() ?? '';
  const scoreNames = names.split(',').map((n) => n.trim()).filter(Boolean);
  if (scoreNames.length === 0) throw new Error('at least one score name is required');
  return { dataset, taskFile, scoreNames };
}

export function evalTemplate(answers: InitAnswers, evalFile: string, sdkFile: string): string {
  const scores = answers.scoreNames
    .map((name) => `    (item, output) => ({ name: '${name}', value: JSON.stringify(output) === JSON.stringify(item.expected) ? 1 : 0 }),`)
    .join('\n');
  return `import { defineEval } from '${relativeImport(evalFile, sdkFile)}';
import { task } from '${relativeImport(evalFile, resolve(answers.taskFile))}';

export const items = [{ id: '${slug(answers.dataset)}-1', input: 'replace with a real input', expected: 'replace with the expected output' }];

export default defineEval({
  dataset: '${answers.dataset}',
  task,
  scores: [
${scores}
  ],
});
`;
}

export async function init(ask?: (question: string) => string | null, cwd: string = process.cwd()): Promise<string> {
  const answers = askAnswers(ask);
  const realCwd = realpathSync(cwd);
  const evalFile = resolve(realCwd, 'evals', `${slug(answers.dataset)}.ts`);
  const sdkFile = realpathSync(resolve(import.meta.dir, 'index.ts'));
  await mkdir(dirname(evalFile), { recursive: true });
  await Bun.write(evalFile, evalTemplate({ ...answers, taskFile: resolve(realCwd, answers.taskFile) }, evalFile, sdkFile));
  const loaded = await loadEval(evalFile);
  const config = configFromEnv();
  const report = await runEval(loaded.def, loaded.items, { name: loaded.name, send: true, create: true, client: config });
  return [`wrote ${relative(realCwd, evalFile)}`, '', formatSummary(report.summary, report), `inbox    ${config.url}/`].join('\n');
}
