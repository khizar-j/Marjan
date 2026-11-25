/* Inner pages (the service pages, About us, Contact us, the services index). Runs after site.js (window.MFX) and
   main.js, which already handle the shared parts: reveals, smooth scrolling, WhatsApp links, the country pop-ups, the
   arch, the FAQ, the quote form, the closing card and the five-stop routes. This file adds:
   - Hero video: the page clip ([data-video] on the hero), looping over its poster
   - The sheet: everything after the hero rises over it as you scroll, like the home page
   - The quote form starts on the page service (<body data-quote-service="…">) */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const hero = $('[data-uhero]');

  /* ---------- Hero video ----------
     After the page has loaded (so it never competes with the poster, fonts and styles), a muted, looping clip is added:
     -m.mp4 (an upright cut) on phones held upright, -1080.mp4 elsewhere. Save-Data and 2g keep the poster. Like the home
     page, it plays with reduced motion on too (the pause button stops it). Paused while the hero is off screen or
     covered by the sheet, the tab is hidden, or the visitor pauses it. */
  let covered = false;
  let sync = () => {};
  if (hero && hero.dataset.video) {
    const media = $('.uhero__media', hero);
    const btn = $('[data-uhero-pause]', hero);
    const net = navigator.connection || {};
    const lite = !!net.saveData || /2g/.test(net.effectiveType || '');
    const phone = matchMedia('(max-width: 639.98px) and (orientation: portrait)');
    const file = () => `${hero.dataset.video}-${phone.matches ? 'm' : '1080'}.mp4`;
    let v = null, inView = true, paused = false;
    const halted = () => paused || covered || !inView || document.hidden;
    sync = () => {
      if (!v) return;
      if (halted()) v.pause();
      else { const p = v.play(); if (p) p.catch(() => {}); }
    };
    const start = () => {
      if (lite || v) return;
      v = document.createElement('video');
      v.muted = v.defaultMuted = v.loop = v.playsInline = true;
      for (const a of ['muted', 'playsinline', 'loop', 'disablepictureinpicture', 'disableremoteplayback']) v.setAttribute(a, '');
      v.setAttribute('aria-hidden', 'true');
      v.tabIndex = -1;
      v.preload = 'auto';
      v.src = file();
      v.addEventListener('playing', () => { v.classList.add('is-on'); if (btn) btn.hidden = false; });
      media.insertBefore(v, $('.uhero__shade', media));
      sync();
    };
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }).observe(hero);
    document.addEventListener('visibilitychange', sync);
    if (btn) btn.addEventListener('click', () => {
      paused = !paused;
      btn.classList.toggle('is-paused', paused);
      btn.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} the background video`);
      sync();
    });
    // turning a phone swaps to the right file, from the same point
    phone.addEventListener('change', () => {
      if (!v) return;
      const t = v.currentTime;
      v.classList.remove('is-on');
      v.src = file();
      v.currentTime = t;
      sync();
    });
    if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
  }

  /* ---------- The sheet ----------
     The same as the home page (js/site/10-hero.js "Scrolling away"): the hero stays put (sticky) and sinks back, a little
     lower (8%), smaller (7%) and darker (60%), while the sheet rises over it. Once the sheet's top is 40px above the
     screen the hero turns see-through (body.is-hero-gone), so a phone that falls behind on a fast flick shows page
     colour, not video. Fully covered, the video pauses. */
  const sheet = $('[data-usheet]');
  if (hero && sheet && window.MFX) {
    let seen = 1;
    const measure = () => {
      const h = hero.offsetHeight;
      const vh = MFX.svh();
      hero.style.top = `${Math.min(0, vh - h)}px`; // a hero taller than the screen sticks once its bottom is in view
      seen = Math.max(1, Math.min(h, vh));
    };
    measure();
    MFX.onScreen(measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(hero);
    const dim = document.createElement('i');
    dim.className = 'uhero__dim';
    dim.setAttribute('aria-hidden', 'true');
    hero.appendChild(dim);
    let cover = -1, gone = false;
    MFX.progress(sheet.firstElementChild || sheet, (_, r) => {
      const away = r.top < -40;
      if (away !== gone) { gone = away; document.body.classList.toggle('is-hero-gone', away); }
      const c = MFX.clamp((seen - r.top) / seen);
      if (c === cover) return;
      cover = c;
      hero.style.translate = `0 ${(c * 8).toFixed(3)}%`;
      hero.style.scale = (1 - c * 0.07).toFixed(4);
      hero.classList.toggle('is-lifting', c > 0.001);
      dim.style.opacity = (c * 0.6).toFixed(3);
      const full = c > 0.99;
      if (full !== covered) { covered = full; sync(); }
    });
    // keyboard focus going back into a covered hero scrolls it back into view
    hero.addEventListener('focusin', (e) => {
      if (cover > 0.02 && e.target.matches(':focus-visible')) {
        scrollTo({ top: Math.max(0, hero.offsetTop + hero.offsetHeight - seen), behavior: MFX.reduced() ? 'auto' : 'smooth' });
      }
    });
  }

  /* ---------- Quote form: a service page starts the form on its own service ---------- */
  const want = document.body.dataset.quoteService;
  const form = $('[data-quote-form]');
  const sel = form && form.elements.service;
  if (want && sel && !sel.value && [...sel.options].some((o) => o.value === want)) {
    sel.value = want;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ---------- Place chips on one line (destination cards, [data-chips-fit]) ----------
     The chips that do not fit on the line are hidden from the end and counted in a "+N" chip, which reads the hidden
     names out to screen readers. Measured again whenever the list changes width (turning a phone, resizing). */
  const fitChips = (ul) => {
    const items = [...ul.children].filter((li) => !li.classList.contains('chips__plus'));
    let plus = ul.querySelector('.chips__plus');
    if (!plus) { plus = document.createElement('li'); plus.className = 'chips__plus'; ul.append(plus); }
    items.forEach((li) => { li.hidden = false; });
    plus.hidden = true;
    const fits = () => ul.scrollWidth <= ul.clientWidth + 1;
    if (fits()) return;
    plus.hidden = false;
    const gone = [];
    for (let i = items.length - 1; i > 0; i--) {
      items[i].hidden = true;
      gone.unshift(items[i].textContent);
      plus.innerHTML = `<span aria-hidden="true">+${gone.length}</span><span class="sr-only">, and ${gone.join(', ')}</span>`;
      if (fits()) break;
    }
  };
  const chipLists = [...document.querySelectorAll('[data-chips-fit]')];
  if (chipLists.length) {
    const fitAll = () => chipLists.forEach(fitChips);
    fitAll();
    if (document.fonts) document.fonts.ready.then(fitAll); // the web font changes the widths
    if ('ResizeObserver' in window) {
      const widths = new WeakMap();
      const ro = new ResizeObserver((entries) => entries.forEach(({ target }) => {
        const w = target.clientWidth;
        if (widths.get(target) !== w) { widths.set(target, w); fitChips(target); }
      }));
      chipLists.forEach((ul) => ro.observe(ul));
    }
  }

  /* ---------- Descriptions that end on the same line ([data-even-lines], Our values on About us) ----------
     The copy is written to the same length, but at some widths one description still wraps a line shorter than the
     rest. That one gets a slightly narrower measure (never under 70% of its width) until it has as many lines as the
     longest, so all the texts in the list are the same height. Measured again when the list changes width. */
  const evenLines = (list) => {
    const ps = [...list.querySelectorAll(':scope > li > p')];
    if (!ps.length) return;
    ps.forEach((p) => { p.style.maxWidth = ''; });
    const lh = parseFloat(getComputedStyle(ps[0]).lineHeight);
    if (!lh) return;
    const lines = (p) => Math.round(p.getBoundingClientRect().height / lh);
    const most = Math.max(...ps.map(lines));
    ps.forEach((p) => {
      if (lines(p) >= most) return;
      const full = p.getBoundingClientRect().width;
      let lo = full * 0.7, hi = full; // lo: narrow enough (or the floor), hi: too wide
      p.style.maxWidth = lo + 'px';
      if (lines(p) < most) { p.style.maxWidth = ''; return; }
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2;
        p.style.maxWidth = mid + 'px';
        if (lines(p) >= most) lo = mid; else hi = mid;
      }
      p.style.maxWidth = Math.floor(lo) + 'px';
      if (lines(p) !== most) p.style.maxWidth = '';
    });
  };
  const evenLists = [...document.querySelectorAll('[data-even-lines]')];
  if (evenLists.length) {
    const evenAll = () => evenLists.forEach(evenLines);
    evenAll();
    if (document.fonts) document.fonts.ready.then(evenAll);
    if ('ResizeObserver' in window) {
      const widths = new WeakMap();
      const ro = new ResizeObserver((entries) => entries.forEach(({ target }) => {
        const w = target.clientWidth;
        if (widths.get(target) !== w) { widths.set(target, w); evenLines(target); }
      }));
      evenLists.forEach((ul) => ro.observe(ul));
    }
  }
})();
