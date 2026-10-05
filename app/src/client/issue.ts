import { patchIssue } from './api.ts';
import './list.ts';
import './detail.ts';
import './panels.ts';
import './peek.ts';

for (const f of document.querySelectorAll<HTMLFormElement>('form[data-link-judge]')) {
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = String(new FormData(f).get('judge_name') ?? '');
    const id = document.querySelector<HTMLElement>('[data-issue]')?.dataset.issue ?? '';
    void patchIssue(id, { judge_name: name === '' ? null : name }).then((error) => {
      if (error === null) location.reload();
      else {
        const slot = f.querySelector<HTMLElement>('[data-error]');
        if (slot) slot.textContent = error;
      }
    });
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
