/* Version 2 · showcase sections: Umrah packages, destinations and numbers (styles in css/v2/30-showcase.css).
   Everything follows the visitor's own scrolling through window.MFX; nothing here reads layout itself
   (except one rect when the mouse enters a package card) and nothing runs while a section is off screen. */
(() => {
  const M = window.MFX;
  if (!M) return;
  const d = document;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const out = (x) => 1 - (1 - x) ** 2; // ease-out: soft landing
  const out3 = (x) => 1 - (1 - x) ** 3; // stronger, for the counters
  const f3 = (v) => v.toFixed(3);

  /* ---------- Umrah packages: the cards rise and settle into place, left to right, as you scroll to them ---------- */
  const track = $('[data-v2-pk]');
  if (track) {
    const cards = $$('.pk', track);
    cards.forEach((card) => M.progress(card, (p, r) => {
      const lag = M.clamp(r.left / innerWidth) * 0.25; // cards further right land a little later
      card.style.setProperty('--pk-e', f3(out(M.range(p, lag, lag + 0.75))));
    }, { mode: 'enter', span: 0.75 }));

    // a gentle tilt toward the mouse while hovering (mouse only; CSS limits it to the grid layout)
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      cards.forEach((card) => {
        let box = null;
        let y0 = 0;
        card.addEventListener('pointerenter', () => { box = card.getBoundingClientRect(); y0 = scrollY; });
        card.addEventListener('pointermove', (e) => {
          if (!box) return;
          const a = M.reduced() ? 2 : 5; // degrees at the edge of the card
          const x = M.clamp((e.clientX - box.left) / box.width) - 0.5;
          const y = M.clamp((e.clientY - box.top + scrollY - y0) / box.height) - 0.5;
          card.style.setProperty('--pk-rx', `${(-y * a).toFixed(2)}deg`);
          card.style.setProperty('--pk-ry', `${(x * a).toFixed(2)}deg`);
        });
        card.addEventListener('pointerleave', () => {
          box = null;
          card.style.removeProperty('--pk-rx');
          card.style.removeProperty('--pk-ry');
        });
      });
    }
  }

  /* ---------- Destinations: the large photo rises in and settles, the caption follows, the places slide in one by one ---------- */
  $$('[data-v2-dest] .dsh').forEach((box) => M.progress(box, (p) => {
    box.style.setProperty('--ds-e', f3(out(p)));
    box.style.setProperty('--ds-l', f3(M.range(p, 0.2, 0.9)));
  }, { mode: 'enter', span: 0.85 }));

  /* ---------- Numbers: the counters run with your scroll over a drifting dot pattern ---------- */
  const band = $('[data-v2-stats]');
  if (band) {
    // The real figure always stays in the page text (search engines, screen readers, the "Show sample data" switch
    // in main.js); while it counts, the running value is drawn over it from data-n (CSS), so its width never changes.
    const nums = $$('[data-v2-count]', band).map((el) => $('.ph', el) || el);
    M.progress(band, (p) => {
      nums.forEach((t, i) => {
        const raw = t.textContent.trim();
        const num = parseFloat(raw.replace(/,/g, ''));
        const k = out3(M.range(p, 0.25 + i * 0.06, 0.8 + i * 0.06));
        if (Number.isNaN(num) || k >= 1) { t.removeAttribute('data-n'); return; } // placeholders like [YEARS] don't count
        const dec = (raw.split('.')[1] || '').length;
        const v = num * k;
        t.dataset.n = raw.includes(',')
          ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
          : v.toFixed(dec);
      });
    }, { mode: 'enter', span: 0.7 });

    // the dot pattern drifts sideways (and a little upward) while the band passes through the screen
    const dots = $('.stats__dots', band);
    M.progress(band, (p) => {
      const less = M.reduced();
      dots.style.translate = `${(-p * (less ? 24 : 100)).toFixed(1)}px ${(less ? 0 : (0.5 - p) * 24).toFixed(1)}px`;
    });
  }
})();
