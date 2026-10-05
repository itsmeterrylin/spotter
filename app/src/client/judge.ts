import { activateVersion, patchJudge } from './api.ts';
import './list.ts';
import './statusMenu.ts';

const aside = document.querySelector<HTMLElement>('aside[data-judge]');
const name = aside?.dataset.judge ?? '';
const errorSlot = aside?.querySelector<HTMLElement>('[data-error]') ?? null;

const settle = (error: string | null): void => {
  if (error === null) location.reload();
  else if (errorSlot) errorSlot.textContent = error;
};

aside?.querySelector<HTMLSelectElement>('select[data-activate]')?.addEventListener('change', (e) => {
  void activateVersion(name, Number((e.target as HTMLSelectElement).value)).then(settle);
});

aside?.querySelector<HTMLInputElement>('input[data-description]')?.addEventListener('change', (e) => {
  void patchJudge(name, { description: (e.target as HTMLInputElement).value }).then(settle);
});
