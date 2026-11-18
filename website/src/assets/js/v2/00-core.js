/* Version 2 · shared helper for scroll-linked effects (window.MFX). The other v2 files build on it.
   One passive scroll listener and one rAF per frame for the whole page; elements are only measured
   while they are near the screen (IntersectionObserver), so effects cost nothing off-screen. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const items = new Map(); // el -> [{ cb, mode, span, last }]
  const near = new Set();
  let raf = 0;

  // p goes 0 → 1 while the element moves through the screen. Modes:
  //   'through' (default): from its top touching the bottom of the screen to its bottom leaving the top
  //   'enter': from its top touching the bottom of the screen until its top has climbed `span` of the screen height
  const progress = (r, vh, mode, span) => {
    const p = mode === 'enter' ? (vh - r.top) / (vh * span) : (vh - r.top) / (vh + r.height);
    return Math.min(1, Math.max(0, p));
  };

  const frame = () => {
    raf = 0;
    const vh = innerHeight;
    // measure everything first, then let the callbacks write styles (no read/write ping-pong)
    const rects = [...near].map((el) => [el, el.getBoundingClientRect()]);
    for (const [el, r] of rects) {
      for (const it of items.get(el) || []) {
        const p = progress(r, vh, it.mode, it.span);
        if (Math.abs(p - it.last) < 0.0005) continue;
        it.last = p;
        it.cb(p, r);
      }
    }
  };
  const request = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) near.add(e.target);
      else {
        near.delete(e.target);
        // settle at the nearest end, so fast scrolling never leaves an effect half-way
        const r = e.boundingClientRect;
        for (const it of items.get(e.target) || []) {
          const p = r.top > 0 ? 0 : 1;
          if (it.last !== p) { it.last = p; it.cb(p, r); }
        }
      }
    }
    request();
  }, { rootMargin: '20% 0px' });

  window.MFX = {
    /** true when the visitor asked for less motion: keep effects, but make distances smaller */
    reduced: () => reduce.matches,
    /** Calls cb(p, rect) with p from 0 to 1 as el moves through the screen. Returns a function that stops it. */
    progress(el, cb, { mode = 'through', span = 0.8 } = {}) { // mode: 'through' or 'enter'
      if (!el) return () => {};
      const it = { cb, mode, span, last: -1 };
      if (!items.has(el)) { items.set(el, []); io.observe(el); }
      items.get(el).push(it);
      request();
      return () => {
        const list = items.get(el) || [];
        list.splice(list.indexOf(it), 1);
        if (!list.length) { items.delete(el); near.delete(el); io.unobserve(el); }
      };
    },
    /** Shorthand: writes p into a CSS variable (default --p) on el, so CSS can animate with calc() */
    bind(el, opts = {}, name = '--p') {
      return this.progress(el, (p) => el.style.setProperty(name, p.toFixed(4)), opts);
    },
    clamp: (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)),
    /** maps p from the range [a, b] to 0..1 (for staging several moves inside one scroll) */
    range: (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a))),
  };
})();
