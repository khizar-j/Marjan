/* Closing sections: reviews, get a quote, FAQ and the closing call to action.
   Reviews and CTA follow the visitor's scrolling (MFX in 00-core.js); the quote card and the FAQ
   only arrive once and then stay still, so nothing moves while someone types or reads.
   main.js still runs the carousel, the form, the dropdowns and the FAQ; this file only adds motion. */
(() => {
  const M = window.MFX;
  if (!M) return;
  const $ = (s, c = document) => c.querySelector(s);
  const ease = (t) => 1 - (1 - t) ** 3;
  // runs fn once, the first time el comes into view
  const once = (el, fn) => {
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(el);
  };

  /* ---------- Reviews: the cards are dealt in from the right as the section scrolls up ----------
     Only the cards on screen move (counted from where the carousel is), and only until they land
     (by the time the section is well in view). Chrome would re-snap the carousel to moving cards,
     so snapping pauses while a card is landing (.is-dealing in CSS); swiping, the arrows and the
     dots work as before. A card's stars wait faintly (all five) while it is dealt in, light up one by
     one on a short timer once it lands, and then stay lit (.is-dim / CSS transition delays). */
  const track = $('[data-rv-track]');
  if (track) {
    const cards = [...track.children];
    const two = matchMedia('(min-width: 768px)'), three = matchMedia('(min-width: 1100px)');
    let step = 0;  // distance between two cards, measured when the size changes
    let first = 0; // first card on screen
    const measure = () => { step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 0; };
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(track); else measure();
    track.addEventListener('scroll', () => { if (step) first = Math.round(track.scrollLeft / step); }, { passive: true });
    const lit = new WeakSet(); // cards whose stars have lit up (they stay lit)
    const clear = (c) => { c.style.transform = c.style.opacity = ''; c.classList.remove('is-dim'); lit.add(c); };
    M.progress(track, (p) => {
      const r = M.reduced();
      const X = r ? 18 : 64, Y = r ? 4 : 12, R = r ? 1 : 4, S = r ? 0 : 0.04;
      const shown = three.matches ? 3 : two.matches ? 2 : 1; // cards on screen, plus the one peeking in
      let moving = false;
      cards.forEach((c, i) => {
        const k = i - first;
        const e = k < 0 || k > shown ? 1 : ease(M.range(p, k * 0.1, k * 0.1 + 0.6));
        if (e >= 1) return clear(c);
        moving = true;
        const q = 1 - e;
        c.style.transform = `translate3d(${(X * q).toFixed(1)}px,${(Y * q).toFixed(1)}px,0) rotate(${(R * q).toFixed(2)}deg) scale(${(1 - S * q).toFixed(4)})`;
        c.style.opacity = Math.min(1, e * 1.6).toFixed(3);
        if (!lit.has(c)) c.classList.add('is-dim');
      });
      track.classList.toggle('is-dealing', moving);
    }, { mode: 'enter', span: 0.75 });
  }

  /* ---------- Get a quote: the card rises in once, then its contents follow in a short stagger ----------
     The glow in the navy panel rises into its corner while the card comes up, and then stays put. */
  const quote = $('[data-quote-card]');
  if (quote) {
    [...quote.querySelectorAll('.quote__intro > *, .quote__form > *')].forEach((el, i) => el.style.setProperty('--i', i));
    quote.classList.add('fx');
    once(quote, () => quote.classList.add('in'));
    M.progress(quote, (p) => {
      const q = 1 - ease(p), d = M.reduced() ? 0.35 : 1;
      quote.style.setProperty('--gx', `${(q * 140 * d).toFixed(1)}px`);
      quote.style.setProperty('--gy', `${(q * 200 * d).toFixed(1)}px`);
    }, { mode: 'enter', span: 0.9 });
  }

  /* ---------- FAQ: the questions arrive in a short stagger, once ---------- */
  const faq = $('[data-faq-list]');
  if (faq) {
    [...faq.children].forEach((el, i) => el.style.setProperty('--i', i));
    faq.classList.add('fx');
    once(faq, () => faq.classList.add('in'));
  }

  /* ---------- Closing CTA: the photo opens like a plane window as you scroll in ----------
     A tall rounded window (sized from the card) widens to the full card while the view settles
     from a gentle zoom; the headline, text and buttons rise in as it opens and are fully in by
     p = 0.45, when the window no longer covers them. With reduced motion the window starts almost
     full size and there is no zoom. */
  const cta = $('[data-cta-window]');
  if (cta) {
    const img = $('.cta__media img', cta);
    const kids = [...$('.cta__content', cta).children];
    M.progress(cta, (p, box) => {
      const r = M.reduced();
      const t0 = M.range(p, 0.02, 0.5), o =t0 * t0 * (3 - 2 * t0), q = 1 - o;
      const W = box.width, H = box.height;
      const h = H * (r ? 0.94 : 0.86), w = r ? W * 0.86 : Math.min(W * 0.62, h * 0.8);
      cta.style.clipPath = o >= 1 ? '' : `inset(${((H - h) / 2 * q).toFixed(1)}px ${((W - w) / 2 * q).toFixed(1)}px round ${(28 + ((r ? 64 : w * 0.42) - 28) * q).toFixed(1)}px)`;
      if (img) img.style.transform = o >= 1 || r ? '' : `scale(${(1 + q * 0.16).toFixed(4)})`;
      kids.forEach((k, i) => {
        const t = ease(M.range(p, 0.14 + i * 0.07, 0.31 + i * 0.07));
        k.style.opacity = t >= 1 ? '' : t.toFixed(3);
        k.style.transform = t >= 1 ? '' : `translate3d(0,${((1 - t) * (r ? 8 : 24)).toFixed(1)}px,0)`;
      });
    }, { mode: 'enter', span: 0.7 });
  }
})();
