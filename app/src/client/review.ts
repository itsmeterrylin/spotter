import { uuid7 } from '@spotter/evals/uuid7';

type Verdict = 'pass' | 'fail' | 'defer';
type TraceBody = { input: unknown; output: unknown; expected: unknown };

const isVerdict = (v: string | undefined): v is Verdict => v === 'pass' || v === 'fail' || v === 'defer';

const headers = { 'content-type': 'application/json' };

function wire(root: HTMLElement): void {
  const traceId = root.dataset.trace ?? '';
  const name = root.dataset.score || 'human';
  const next = root.dataset.next || null;
  const prev = root.dataset.prev || null;
  const home = root.dataset.home ?? '/';
  const note = document.getElementById('note') as HTMLTextAreaElement;
  const error = document.getElementById('error') as HTMLElement;
  const picker = document.getElementById('picker') as HTMLElement;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-verdict]')];
  let saved: Verdict | null = isVerdict(root.dataset.verdict) ? root.dataset.verdict : null;
  let busy = false;

  const go = (url: string | null): void => {
    location.href = url ?? home;
  };
  const press = (v: Verdict | null): void => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.verdict === v));
  };
  const setBusy = (on: boolean): void => {
    busy = on;
    for (const b of buttons) b.disabled = on;
  };

  async function save(v: Verdict): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    error.textContent = '';
    const body = JSON.stringify({ scores: [{ name, source: 'human', verdict: v, note: note.value || null }] });
    const res = await fetch(`/api/traces/${traceId}/scores`, { method: 'PUT', headers, body }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      error.textContent = `Not saved (${res ? res.status : 'offline'}). Press again.`;
      return false;
    }
    saved = v;
    press(v);
    return true;
  }

  const verdictThenMove = async (v: Verdict): Promise<void> => {
    if (!(await save(v))) return;
    if (v === 'fail') note.focus();
    else go(next);
  };

  async function undo(): Promise<void> {
    if (busy || !saved) return;
    setBusy(true);
    error.textContent = '';
    const query = `name=${encodeURIComponent(name)}&source=human`;
    const res = await fetch(`/api/traces/${traceId}/scores?${query}`, { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      error.textContent = `Not cleared (${res ? res.status : 'offline'}). Press U again.`;
      return;
    }
    saved = null;
    press(null);
  }

  const openPicker = (): void => picker.setAttribute('data-open', '');
  const closePicker = (): void => picker.removeAttribute('data-open');

  async function addTo(datasetId: string, label: string): Promise<void> {
    const res = await fetch(`/api/traces/${traceId}`).catch(() => null);
    if (!res || !res.ok) return;
    const t = (await res.json()) as TraceBody;
    const expected = t.expected ?? (saved === 'pass' ? t.output : undefined);
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

  for (const b of buttons) b.addEventListener('click', () => void verdictThenMove(b.dataset.verdict as Verdict));
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
      if (saved) void save(saved).then((ok) => ok && go(next));
      return;
    }
    if (document.activeElement === note) return;
    const key = e.key.toLowerCase();
    if (key === '1') void verdictThenMove('pass');
    else if (key === '2') void verdictThenMove('fail');
    else if (key === 'd') void verdictThenMove('defer');
    else if (key === 'u') void undo();
    else if (key === 'a') openPicker();
    else if (e.key === 'ArrowRight') go(next);
    else if (e.key === 'ArrowLeft') go(prev);
    else if (e.key === 'Escape') go(home);
  });
}

const root = document.getElementById('review');
if (root) wire(root);
