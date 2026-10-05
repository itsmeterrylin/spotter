import { activateVersion, patchIssue, patchJudge } from './api.ts';
import './statusMenu.ts';

const around = (el: EventTarget | null, selector: string): HTMLElement | null => (el instanceof Element ? el.closest<HTMLElement>(selector) : null);

const settle = (panel: HTMLElement, error: string | null): void => {
  if (error === null) location.reload();
  else {
    const slot = panel.querySelector<HTMLElement>('[data-error]');
    if (slot) slot.textContent = error;
  }
};

document.addEventListener('statusmenu:pick', (e) => {
  const form = around(e.target, '[data-issue]')?.querySelector<HTMLFormElement>('form[data-dismiss-form]');
  if (!form) return;
  form.hidden = false;
  form.querySelector('input')?.focus();
});

document.addEventListener('submit', (e) => {
  const form = e.target instanceof HTMLFormElement && e.target.matches('form[data-dismiss-form]') ? e.target : null;
  const panel = around(form, '[data-issue]');
  if (!form || !panel) return;
  e.preventDefault();
  const reason = String(new FormData(form).get('reason') ?? '');
  void patchIssue(panel.dataset.issue ?? '', { status: 'dismissed', dismissed_reason: reason }).then((error) => settle(panel, error));
});

document.addEventListener('change', (e) => {
  const panel = around(e.target, '[data-judge]');
  if (!panel) return;
  const name = panel.dataset.judge ?? '';
  if (e.target instanceof HTMLSelectElement && e.target.matches('[data-activate]')) void activateVersion(name, Number(e.target.value)).then((error) => settle(panel, error));
  else if (e.target instanceof HTMLInputElement && e.target.matches('[data-description]')) void patchJudge(name, { description: e.target.value }).then((error) => settle(panel, error));
});
