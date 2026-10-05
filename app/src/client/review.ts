import { uuid7 } from '@spotter/evals/uuid7';

type Verdict = 'pass' | 'fail' | 'defer';
type TraceBody = { input: unknown; output: unknown; expected: unknown };
type Row = { el: HTMLElement; turn: number | null; buttons: HTMLButtonElement[]; saved: Verdict | null };

const isVerdict = (v: string | undefined): v is Verdict => v === 'pass' || v === 'fail' || v === 'defer';

const headers = { 'content-type': 'application/json' };

const rowOf = (el: HTMLElement): Row => ({
  el,
  turn: el.dataset.turn ? Number(el.dataset.turn) : null,
  buttons: [...el.querySelectorAll<HTMLButtonElement>('button[data-verdict]')],
  saved: isVerdict(el.dataset.verdict) ? el.dataset.verdict : null,
});

function wire(root: HTMLElement): void {
  const traceId = root.dataset.trace ?? '';
  const name = root.dataset.score || 'human';
  const next = root.dataset.next || null;
  const prev = root.dataset.prev || null;
  const home = root.dataset.home ?? '/';
  const note = document.getElementById('note') as HTMLTextAreaElement;
  const error = document.getElementById('error') as HTMLElement;
  const picker = document.getElementById('picker') as HTMLElement;
  const rows = [...root.querySelectorAll<HTMLElement>('.verdict-row')].map(rowOf);
  const whole = rows[rows.length - 1];
  let focused = Math.max(0, rows.findIndex((r) => r.el.hasAttribute('data-focus')));
  let busy = false;

  const go = (url: string | null): void => {
    location.href = url ?? home;
  };
  const press = (row: Row, v: Verdict | null): void => {
    row.saved = v;
    for (const b of row.buttons) b.setAttribute('aria-pressed', String(b.dataset.verdict === v));
  };
  const setBusy = (on: boolean): void => {
    busy = on;
    for (const r of rows) for (const b of r.buttons) b.disabled = on;
  };
  const focus = (index: number): void => {
    focused = Math.min(rows.length - 1, Math.max(0, index));
    for (const [i, r] of rows.entries()) {
      if (i === focused) r.el.setAttribute('data-focus', '1');
      else r.el.removeAttribute('data-focus');
    }
    rows[focused]?.el.scrollIntoView({ block: 'nearest' });
  };
  const current = (): Row | undefined => rows[focused];

  async function save(row: Row, v: Verdict): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    error.textContent = '';
    const score = { name, source: 'human', verdict: v, note: row.turn === null ? note.value || null : null, turn: row.turn };
    const res = await fetch(`/api/traces/${traceId}/scores`, { method: 'PUT', headers, body: JSON.stringify({ scores: [score] }) }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      error.textContent = `Not saved (${res ? res.status : 'offline'}). Press again.`;
      return false;
    }
    press(row, v);
    return true;
  }

  const verdictThenMove = async (row: Row, v: Verdict): Promise<void> => {
    if (!(await save(row, v))) return;
    if (row.turn !== null) focus(rows.indexOf(row) + 1);
    else if (v === 'fail') note.focus();
    else go(next);
  };

  async function undo(row: Row): Promise<void> {
    if (busy || !row.saved) return;
    setBusy(true);
    error.textContent = '';
    const query = `name=${encodeURIComponent(name)}&source=human&turn=${row.turn ?? 'null'}`;
    const res = await fetch(`/api/traces/${traceId}/scores?${query}`, { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      error.textContent = `Not cleared (${res ? res.status : 'offline'}). Press U again.`;
      return;
    }
    press(row, null);
  }

  const openPicker = (): void => picker.setAttribute('data-open', '');
  const closePicker = (): void => picker.removeAttribute('data-open');

  async function addTo(datasetId: string, label: string): Promise<void> {
    const res = await fetch(`/api/traces/${traceId}`).catch(() => null);
    if (!res || !res.ok) return;
    const t = (await res.json()) as TraceBody;
    const expected = t.expected ?? (whole?.saved === 'pass' ? t.output : undefined);
    const item = { id: uuid7(), input: t.input ?? null, expected, source_trace_id: traceId };
    const put = await fetch(`/api/datasets/${datasetId}/items`, { method: 'PUT', headers, body: JSON.stringify({ items: [item] }) }).catch(() => null);
    closePicker();
    if (!put || !put.ok) {
      error.textContent = `Not added (${put ? put.status : 'offline'}). Press A again.`;
      return;
    }
    const pill = document.createElement('span');
    pill.className = 'pill pill-pass';
    pill.textContent = label;
    root.querySelector('.hint')?.append(pill);
  }

  for (const row of rows) {
    for (const b of row.buttons) {
      b.addEventListener('click', () => {
        focus(rows.indexOf(row));
        void verdictThenMove(row, b.dataset.verdict as Verdict);
      });
    }
  }
  for (const opt of picker.querySelectorAll<HTMLButtonElement>('[data-dataset]')) {
    opt.addEventListener('click', () => void addTo(opt.dataset.dataset ?? '', opt.textContent?.trim() ?? ''));
  }
  picker.querySelector('[data-picker-close]')?.addEventListener('click', closePicker);

  document.addEventListener('keydown', (e) => {
    if (picker.hasAttribute('data-open')) {
      if (e.key === 'Escape') closePicker();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (whole?.saved) void save(whole, whole.saved).then((ok) => ok && go(next));
      return;
    }
    if (document.activeElement === note) return;
    const row = current();
    if (!row) return;
    const key = e.key.toLowerCase();
    if (key === '1') void verdictThenMove(row, 'pass');
    else if (key === '2') void verdictThenMove(row, 'fail');
    else if (key === 'd') void verdictThenMove(row, 'defer');
    else if (key === 'u') void undo(row);
    else if (key === 'a') openPicker();
    else if (e.key === 'ArrowDown') focus(focused + 1);
    else if (e.key === 'ArrowUp') focus(focused - 1);
    else if (e.key === 'ArrowRight') go(next);
    else if (e.key === 'ArrowLeft') go(prev);
    else if (e.key === 'Escape') go(home);
  });
}

const root = document.getElementById('review');
if (root) wire(root);
