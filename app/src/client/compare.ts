import './rows.ts';

const params = new URLSearchParams(location.search);

function setParam(key: string, value: string | null): void {
  if (value) params.set(key, value);
  else params.delete(key);
  const qs = params.toString().replace(/%2C/g, ',');
  history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}`);
  location.reload();
}

document.querySelector<HTMLButtonElement>('[data-only]')?.addEventListener('click', () => {
  setParam('only', params.get('only') === 'changes' ? null : 'changes');
});

for (const th of document.querySelectorAll<HTMLElement>('th[data-score]')) {
  th.style.cursor = 'pointer';
  th.addEventListener('click', () => {
    const name = th.dataset.score ?? null;
    setParam('score', params.get('score') === name ? null : name);
  });
}
