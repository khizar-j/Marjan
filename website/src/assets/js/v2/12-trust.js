/* Version 2 · phone trust strip ticker (styles in css/v2/10-hero.css).
   Adds one copy of the five credentials after the originals, hidden from screen readers, so the row can glide by
   half its width and join up with no gap. The copy keeps the placeholders' data, so the "Sample data" switch
   (main.js, which looks up every .ph when flipped) updates it too. --ticker-dur keeps the pace steady whatever
   the text length: half the row's width at SPEED px a second. */
(() => {
  const list = document.querySelector('.v2 .trust__list');
  if (!list || list.querySelector('.is-copy')) return;
  const SPEED = 36; // px per second
  [...list.children].forEach((li) => {
    const copy = li.cloneNode(true);
    copy.classList.add('is-copy');
    copy.setAttribute('aria-hidden', 'true');
    list.appendChild(copy);
  });
  const pace = () => {
    const half = list.scrollWidth / 2;
    if (half > 0) list.style.setProperty('--ticker-dur', `${(half / SPEED).toFixed(1)}s`);
  };
  pace();
  if ('ResizeObserver' in window) new ResizeObserver(pace).observe(list);
  else addEventListener('resize', pace);
})();
