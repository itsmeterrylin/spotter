import type { Cell, Comparison } from '../services/compare.ts';
import type { DatasetView } from '../services/datasets.ts';
import { urls } from '../urls.ts';
import { Layout } from './Layout.tsx';
import { Crumbs, Empty, Icon, pct, short, summarize } from './ui.tsx';

type Props = { comparison: Comparison; dataset: DatasetView; only: boolean; score?: string; inbox: number };

const CellDiff = ({ a, b }: { a: number | undefined; b: number | undefined }) => {
  if (a === undefined && b === undefined) return <span class="muted">–</span>;
  if (a === undefined || b === undefined) return <span class="num">{pct(a ?? b ?? 0)}</span>;
  const d = Math.round((b - a) * 1000);
  const name = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
  return (
    <span class={`cell-diff ${d > 0 ? 'pos' : d < 0 ? 'neg' : ''}`}>
      <Icon name={name} size="sm" label={name} />
      {d === 0 ? pct(b) : `${pct(a)} → ${pct(b)}`}
    </span>
  );
};

const rowClass = (a: Cell | null, b: Cell | null, names: string[]): string => {
  if (!a || !b) return '';
  const worse = names.some((n) => (b.scores[n] ?? 0) < (a.scores[n] ?? 0));
  const better = names.some((n) => (b.scores[n] ?? 0) > (a.scores[n] ?? 0));
  return worse ? 'changed' : better ? 'improved' : '';
};

export const ComparePage = ({ comparison, dataset, only, score, inbox }: Props) => {
  const runs = comparison.runs;
  const first = runs[0];
  const last = runs[runs.length - 1];
  const names = Object.keys(comparison.summary);
  const columns = 1 + runs.length + names.length;
  return (
    <Layout title={`Spotter · Compare ${dataset.name}`} inbox={inbox} script="compare">
      <Crumbs items={last ? [[urls.run(last.id), last.name]] : []} />
      <div class="page-head">
        <div class="chips">
          {runs.map((r, i) => (
            <>
              {i > 0 ? <Icon name="next" size="sm" /> : null}
              <a class={`pill ${i === runs.length - 1 ? 'pill-pass' : ''}`} href={r.url}>{r.name}</a>
            </>
          ))}
        </div>
        <button class="btn btn-secondary btn-compact" type="button" aria-pressed={only ? 'true' : 'false'} data-only>
          <Icon name="filter" size="sm" />Only changes
        </button>
      </div>
      <div class="card card-flush scroll-x">
        <table class="table">
          <thead>
            <tr>
              <th>Item</th>
              {runs.map((r) => <th>{r.name}</th>)}
              {names.map((n) => (
                <th class="num" data-score={n} data-selected={n === score ? '1' : undefined}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.items.length ? (
              comparison.items.map((item) => {
                const a = first ? item.cells[first.id] ?? null : null;
                const b = last ? item.cells[last.id] ?? null : null;
                const open = b ?? a;
                return (
                  <tr class={`linkrow ${rowClass(a, b, names)}`} data-href={open?.url}>
                    <td>
                      <div class="stack" style="--gap: 2px">
                        <span class="strong mono">{short(item.item_id)}</span>
                        <span class="t-caption muted">{summarize(item.input)}</span>
                      </div>
                    </td>
                    {runs.map((r) => <td class="out">{summarize(item.cells[r.id]?.output)}</td>)}
                    {names.map((n) => (
                      <td class="num"><CellDiff a={a?.scores[n]} b={b?.scores[n]} /></td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colspan={columns}><Empty icon="pass" title={only ? 'No changes' : 'No items'} /></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};
