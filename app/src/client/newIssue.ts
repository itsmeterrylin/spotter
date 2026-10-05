type Upsert = { id: string; status: string; suppressed: boolean; url: string };
type ApiError = { error?: { message?: string } };

const formIn = (el: Element): HTMLFormElement | null =>
  el.closest('.pane-inner, main')?.querySelector<HTMLFormElement>('form[data-new-issue]') ?? document.querySelector<HTMLFormElement>('form[data-new-issue]');

const open = (form: HTMLFormElement, turn: string | undefined): void => {
  const select = form.elements.namedItem('turn');
  if (turn !== undefined && select instanceof HTMLSelectElement) select.value = turn;
  form.hidden = false;
  form.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
};

const showSuppressed = async (form: HTMLFormElement, result: Upsert): Promise<void> => {
  const slot = form.querySelector<HTMLElement>('[data-new-issue-result]');
  if (!slot) return;
  const issue = (await (await fetch(`/api/issues/${result.id}`)).json()) as { title?: string };
  slot.innerHTML = '<span class="pill"><svg class="ic ic-sm" aria-hidden="true"><use href="#i-dismiss"/></svg>Dismissed</span>';
  const link = document.createElement('a');
  link.className = 'link';
  link.href = result.url;
  link.textContent = issue.title ?? 'Open';
  slot.append(link);
};

async function submit(form: HTMLFormElement): Promise<void> {
  const data = new FormData(form);
  const turn = String(data.get('turn') ?? '');
  const trace = form.dataset.trace ?? '';
  const error = form.querySelector<HTMLElement>('[data-error]');
  if (error) error.textContent = '';
  const res = await fetch('/api/issues', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      project: form.dataset.project,
      title: String(data.get('title') ?? ''),
      severity: String(data.get('severity') ?? 'medium'),
      seed_trace_id: trace,
      traces: [{ trace_id: trace, turn: turn === '' ? null : Number(turn) }],
      created_by: 'human',
    }),
  });
  const body = (await res.json()) as Upsert & ApiError;
  if (!res.ok) {
    if (error) error.textContent = body.error?.message ?? `HTTP ${res.status}`;
    return;
  }
  if (body.suppressed) await showSuppressed(form, body);
  else location.href = body.url;
}

export function wireNewIssue(): void {
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const opener = e.target.closest<HTMLElement>('[data-new-issue-open]');
    if (opener) {
      const form = formIn(opener);
      if (form) open(form, opener.dataset.turn);
      return;
    }
    const cancel = e.target.closest('[data-new-issue-cancel]');
    const form = cancel?.closest<HTMLFormElement>('form[data-new-issue]');
    if (form) form.hidden = true;
  });
  document.addEventListener('submit', (e) => {
    if (!(e.target instanceof HTMLFormElement) || !e.target.matches('[data-new-issue]')) return;
    e.preventDefault();
    void submit(e.target);
  });
}
