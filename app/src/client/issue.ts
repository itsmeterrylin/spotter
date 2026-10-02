import { patchIssue } from './api.ts';

const aside = document.querySelector<HTMLElement>('aside[data-issue]');
const id = aside?.dataset.issue ?? '';
const errorSlot = aside?.querySelector<HTMLElement>('[data-error]') ?? null;
const dismissForm = aside?.querySelector<HTMLFormElement>('form[data-dismiss-form]') ?? null;

const apply = async (body: Record<string, unknown>, slot: HTMLElement | null = errorSlot): Promise<void> => {
  const error = await patchIssue(id, body);
  if (error === null) location.reload();
  else if (slot) slot.textContent = error;
};

for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-status]')) {
  b.addEventListener('click', () => {
    const status = b.dataset.status;
    if (!status || b.getAttribute('aria-checked') === 'true') return;
    if (status === 'dismissed' && dismissForm) {
      dismissForm.hidden = false;
      dismissForm.querySelector('input')?.focus();
      return;
    }
    void apply({ status });
  });
}

dismissForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  void apply({ status: 'dismissed', dismissed_reason: String(new FormData(dismissForm).get('reason') ?? '') });
});

for (const s of document.querySelectorAll<HTMLSelectElement>('select[data-patch]')) {
  s.addEventListener('change', () => void apply({ [s.dataset.patch ?? '']: s.value }));
}

for (const f of document.querySelectorAll<HTMLFormElement>('form[data-link-judge]')) {
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = String(new FormData(f).get('judge_name') ?? '');
    void apply({ judge_name: name === '' ? null : name }, f.querySelector<HTMLElement>('[data-error]'));
  });
}

for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-copy]')) {
  b.addEventListener('click', async () => {
    await navigator.clipboard.writeText(b.dataset.copy ?? '');
    const label = b.querySelector('span');
    if (!label) return;
    label.textContent = 'Copied';
    setTimeout(() => (label.textContent = 'Copy'), 1500);
  });
}
