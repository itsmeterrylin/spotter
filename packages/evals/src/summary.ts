export type ScoreSummary = {
  mean: number;
  n: number;
  baseline_mean: number | null;
  diff: number | null;
  improvements: number;
  regressions: number;
};

export type SummaryView = { run_id: string | null; compare_to: string | null; scores: Record<string, ScoreSummary>; url: string | null };

export type SummaryLinks = { run_url: string | null; compare_url: string | null; compare_note: string | null };

const headers = ['score', 'mean', 'diff', 'improvements', 'regressions'];

const fixed = (n: number): string => n.toFixed(3);

const signed = (n: number | null): string => (n === null ? '-' : `${n >= 0 ? '+' : ''}${fixed(n)}`);

const pad = (text: string, width: number, alignRight: boolean): string => (alignRight ? text.padStart(width) : text.padEnd(width));

export function formatTable(rows: string[][]): string {
  const all = [headers, ...rows];
  const widths = headers.map((_, col) => Math.max(...all.map((row) => (row[col] ?? '').length)));
  return all.map((row) => row.map((cell, col) => pad(cell, widths[col] ?? 0, col > 0)).join('  ').trimEnd()).join('\n');
}

export function summaryRows(summary: SummaryView): string[][] {
  return Object.entries(summary.scores)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, s]) => [name, fixed(s.mean), signed(s.diff), String(s.improvements), String(s.regressions)]);
}

export function formatSummary(summary: SummaryView, links: SummaryLinks): string {
  const lines = [formatTable(summaryRows(summary)), ''];
  if (links.run_url) lines.push(`run      ${links.run_url}`);
  if (links.compare_url) lines.push(`compare  ${links.compare_url}`);
  if (links.compare_note) lines.push(`compare  ${links.compare_note}`);
  return lines.join('\n');
}
