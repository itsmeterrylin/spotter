import { basename, join } from 'node:path';

const clientNames = ['review', 'compare'] as const;

export const pagesCss = (): ReturnType<typeof Bun.file> => Bun.file(join(import.meta.dir, 'pages.css'));

let bundles: Promise<Map<string, string>> | undefined;

async function build(): Promise<Map<string, string>> {
  const result = await Bun.build({
    entrypoints: clientNames.map((n) => join(import.meta.dir, '..', 'client', `${n}.ts`)),
    target: 'browser',
    format: 'esm',
  });
  const out = new Map<string, string>();
  for (const o of result.outputs) out.set(basename(o.path, '.js'), await o.text());
  return out;
}

export const clientBundle = (name: string): Promise<string | undefined> => (bundles ??= build()).then((m) => m.get(name));
