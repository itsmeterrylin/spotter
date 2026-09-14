for (const tr of document.querySelectorAll<HTMLElement>('tr.linkrow[data-href]')) {
  tr.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('a')) return;
    if (tr.dataset.href) location.href = tr.dataset.href;
  });
}
