/* Marjan Travel & Tours — site interactions (vanilla, no dependencies).
   Every piece of copy lives in the HTML; this file only adds behaviour. */
(() => {
  'use strict';
  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Phones: hero + trust strip = one screen (CSS reads --trust-h) ---------- */
  const trustStrip = $('.trust');
  if (trustStrip) {
    const setTrust = () => root.style.setProperty('--trust-h', `${trustStrip.offsetHeight}px`);
    setTrust();
    if ('ResizeObserver' in window) new ResizeObserver(setTrust).observe(trustStrip);
    else addEventListener('resize', setTrust);
  }

  /* ---------- A steady screen height (px), for the route below, html.short-screen and the CSS ----------
     innerHeight grows and shrinks as a phone browser's toolbars slide away and back (by up to ~150px), and
     max-height media queries can follow it, so anything worked out from them jumped or changed layout mid-scroll.
     Chrome on the iPhone goes further: it resizes the whole page in steps as its bars slide away, and even CSS
     100svh and 100vh follow those steps, so the hero (one screen tall) grew 20–35px at a time under your finger and
     the page jolted down. So no layout uses viewport units directly: the CSS reads these two px values instead,
     set here and, on touch screens, measured again only when the width changes (turning the phone):
       --vh-l  the screen with the toolbars away (an empty fixed box 100vh tall), in place of 100vh
       --vh-s  the screen with the toolbars showing (100svh, at most innerHeight at load), in place of 100svh
     Desktop windows have no sliding toolbars, so there both follow every resize. site.js's MFX.vh() / svh() work
     the same way. html.short-screen (760px or less) gives the quote form its tighter phone layout (CSS). */
  const probe = (h) => {
    const el = d.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = `position:fixed;top:0;left:0;width:0;height:100vh;height:${h};visibility:hidden;pointer-events:none`;
    return d.body.appendChild(el);
  };
  const vhBox = probe('100vh');
  const svhBox = probe('100svh');
  let screenH = innerHeight;
  let screenW = -1;
  const readScreen = () => {
    if (!finePointer && innerWidth === screenW) return;
    screenW = innerWidth;
    screenH = vhBox.offsetHeight || innerHeight;
    const small = Math.min(screenH, svhBox.offsetHeight || screenH, innerHeight || screenH);
    root.style.setProperty('--vh-l', `${screenH}px`);
    root.style.setProperty('--vh-s', `${small}px`);
    root.classList.toggle('short-screen', screenH <= 760);
    // phones with a short screen get a tighter hero, so the quote button and some video fit (css: "Short phone screens")
    root.classList.toggle('screen-compact', small < 640);
    root.classList.toggle('screen-tiny', small < 520);
  };
  readScreen();
  addEventListener('resize', readScreen);

  /* ---------- WhatsApp links ---------- */
  const waNumber = (root.dataset.whatsapp || '').replace(/\D/g, '');
  const DEFAULT_MSG = "Assalam o Alaikum Marjan Travel & Tours! I'd like to plan a trip.";
  const waLink = (msg) => `https://wa.me/${waNumber}?text=${encodeURIComponent(msg || DEFAULT_MSG)}`;
  $$('[data-wa]').forEach((a) => {
    a.href = waLink(a.dataset.waMsg);
    a.target = '_blank';
    a.rel = 'noopener';
  });

  /* ---------- Country sheets (tour packages & visas, visa file processing) ----------
     A tile ([data-cs-open]) opens its <dialog class="cs"> with the full details. The page behind is locked
     (html.no-scroll, as for the phone menu), then .is-open fades the scrim in and slides the card up (css:
     "The sheet"). Escape, the scrim and the close button slide it away, then close the dialog; the browser
     puts focus back on the tile. Only the details (.cs__body) scroll, between the photo and the two buttons, on
     phones too. On phones the card can also be swiped down to close: from the photo or the buttons, or from the
     details once they are scrolled back to the top.
     No autofocus: focusing the close button while the card was still below the screen made the browser scroll
     the dialog to reach it, so the card jumped mid-slide. The dialog can't scroll now (overflow: clip in css),
     and the close button is focused with preventScroll.
     "Get a quote" ([data-quote-pick]) closes it at once, fills in the quote form's service and notes, and the
     same-page link code below glides down to the form. */
  {
    const CLOSE_MS = 380; // matches the card's slide out in css
    let closeTimer = 0;
    const closeCs = (dlg, now) => {
      if (!dlg.open) return;
      clearTimeout(closeTimer);
      dlg.classList.remove('is-open');
      if (now) dlg.close();
      else closeTimer = setTimeout(() => dlg.close(), CLOSE_MS);
    };
    const openCs = (dlg) => {
      if (!dlg || typeof dlg.showModal !== 'function') return;
      clearTimeout(closeTimer);
      $$('.cs[open]').forEach((o) => { if (o !== dlg) closeCs(o, true); });
      root.classList.add('no-scroll');
      if (!dlg.open) dlg.showModal();
      dlg.scrollTop = 0;
      // only the details scroll (css "The sheet"): start them at the top, with the fades to match
      const body = $('.cs__body', dlg);
      if (body) { body.scrollTop = 0; edges(body); }
      const close = $('.cs__close', dlg);
      if (close) close.focus({ preventScroll: true });
      requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-open')));
    };
    // phones: drag the card down to close it. It follows the finger (no transition while dragging); let go
    // past a quarter of its height, or with a quick flick, and it slides away, otherwise it springs back.
    const swipeToClose = (dlg) => {
      const box = $('.cs__box', dlg);
      const scrim = $('.cs__scrim', dlg);
      const body = $('.cs__body', dlg);
      if (!box) return;
      let inBody = false; // the touch began on the scrolling details (not the photo or the buttons)
      let y0 = 0;
      let t0 = 0;
      let dy = 0;
      let drag = null; // null = not decided yet, true = moving the card, false = scrolling the details
      const settle = () => { box.style.translate = ''; if (scrim) scrim.style.opacity = ''; };
      box.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1 || !dlg.classList.contains('is-open') || innerWidth >= 760) { drag = false; return; }
        inBody = !!body && body.contains(e.target);
        y0 = e.touches[0].clientY;
        t0 = e.timeStamp;
        dy = 0;
        drag = null;
      }, { passive: true });
      box.addEventListener('touchmove', (e) => {
        if (drag === false) return;
        dy = e.touches[0].clientY - y0;
        if (drag === null) {
          if (Math.abs(dy) < 6) return;
          drag = dy > 0 && (!inBody || body.scrollTop <= 0); // only a pull down from the top moves the card
          if (!drag) return;
          dlg.classList.add('is-dragging');
        }
        e.preventDefault();
        const pull = Math.max(0, dy);
        box.style.translate = `0 ${pull}px`;
        if (scrim) scrim.style.opacity = String(Math.max(0, 1 - pull / box.offsetHeight));
      }, { passive: false });
      const end = (e) => {
        const was = drag;
        drag = null;
        if (!was) return;
        const fast = dy > 40 && dy / Math.max(1, e.timeStamp - t0) > 0.6; // a flick: px per ms
        dlg.classList.remove('is-dragging'); // the transition comes back, so the card glides on from where the finger left it
        settle();
        if (dy > box.offsetHeight / 4 || fast) closeCs(dlg);
      };
      box.addEventListener('touchend', end);
      box.addEventListener('touchcancel', end);
    };
    // only the details scroll. Their top and bottom edges fade out while there is more to scroll that way
    // (.is-scrolled / .has-more, css "The sheet"; phones too, updated on every scroll). On a computer the mouse
    // wheel glides them like the page: the same 1.5 s ease-out-expo glide as "Smooth scrolling" below, restarted
    // on every wheel turn. On phones a finger scrolls them natively, with the phone's own momentum, like the page.
    const edges = (body) => {
      body.classList.toggle('is-scrolled', body.scrollTop > 2);
      body.classList.toggle('has-more', body.scrollTop + body.clientHeight < body.scrollHeight - 2);
    };
    const glide = (box) => {
      const DURATION = 1.5;
      const ease = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t));
      let from = 0;
      let target = 0;
      let current = 0;
      let lastSet = 0;
      let elapsed = 0;
      let raf = 0;
      let last = 0;
      const clamp = (y) => Math.min(box.scrollHeight - box.clientHeight, Math.max(0, y));
      const frame = (now) => {
        elapsed += last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 1 / 60;
        last = now;
        const p = Math.min(1, elapsed / DURATION);
        current = p === 1 ? target : from + (target - from) * ease(p);
        box.scrollTop = current;
        lastSet = box.scrollTop;
        raf = p === 1 ? 0 : requestAnimationFrame(frame);
      };
      box.addEventListener('wheel', (e) => {
        if (e.ctrlKey || box.scrollHeight - box.clientHeight < 2) return; // nothing to scroll: let it be
        const k = e.deltaMode === 1 ? 100 / 6 : e.deltaMode === 2 ? box.clientHeight : 1;
        const dy = e.deltaY * k;
        if (!dy || Math.abs(e.deltaX * k) > Math.abs(dy)) return;
        e.preventDefault();
        from = raf ? current : box.scrollTop;
        target = clamp((raf ? target : box.scrollTop) + dy);
        elapsed = 0;
        if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
      }, { passive: false });
      // the scrollbar, keys or a trackpad's own momentum moved it: stop gliding and follow
      box.addEventListener('scroll', () => {
        if (raf && Math.abs(box.scrollTop - lastSet) > 1.5) { cancelAnimationFrame(raf); raf = 0; }
        edges(box);
      }, { passive: true });
    };
    // the sheet's photo starts loading as soon as a finger or the mouse reaches the tile, so it is there when the card arrives
    const warm = (btn) => { const dlg = d.getElementById(btn.dataset.csOpen); const img = dlg && $('.cs__head img[loading="lazy"]', dlg); if (img) img.loading = 'eager'; };
    $$('[data-cs-open]').forEach((btn) => {
      btn.addEventListener('pointerenter', () => warm(btn), { once: true });
      btn.addEventListener('pointerdown', () => warm(btn), { once: true });
      btn.addEventListener('click', () => openCs(d.getElementById(btn.dataset.csOpen)));
    });
    $$('.cs').forEach((dlg) => {
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeCs(dlg); }); // Escape: slide away first
      dlg.addEventListener('close', () => { // however it closed (a second Escape can't be held back)
        dlg.classList.remove('is-open', 'is-dragging');
        if (!$('.cs[open]')) root.classList.remove('no-scroll');
      });
      $$('[data-cs-close]', dlg).forEach((el) => el.addEventListener('click', () => closeCs(dlg)));
      swipeToClose(dlg);
      const body = $('.cs__body', dlg);
      if (body) glide(body);
    });
    $$('[data-quote-pick]').forEach((a) => a.addEventListener('click', () => {
      const dlg = a.closest('.cs');
      if (dlg) closeCs(dlg, true);
      const form = $('[data-quote-form]');
      if (!form) return;
      // The note replaces the one the last "Get a quote" put in, so two packages never pile up there (the visitor's own
      // words stay). It goes in before the service, whose change event rebuilds the "When" list from both.
      const notes = form.elements.notes;
      const note = a.dataset.quoteNote;
      if (notes && note) {
        const prev = form.dataset.autoNote;
        let own = notes.value;
        if (prev) own = own.replace(`${prev}. `, '').replace(prev, '').trim();
        notes.value = own ? `${note}. ${own}` : note;
        form.dataset.autoNote = note;
        notes.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // a package with a set number of people ("Umrah for 2 Persons", the Umrah planner's pilgrims) sets Travellers
      const count = form.elements.travellers;
      if (count && a.dataset.quoteTravellers) count.value = a.dataset.quoteTravellers;
      const sel = form.elements.service;
      const opt = sel && [...sel.options].find((o) => o.value === a.dataset.quotePick);
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }));
  }

  /* ---------- Current page in nav ---------- */
  const here = location.pathname.replace(/index\.html$/, '');
  $$('.nav__link[href], .mobile-menu a[href]').forEach((a) => {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });

  /* ---------- rAF-throttled scroll ---------- */
  const scrollFns = [];
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { scrollFns.forEach((fn) => fn()); ticking = false; });
  }, { passive: true });

  /* ---------- Smooth scrolling (Lenis, as set up by the Framer smooth-scroll component) ----------
     Each mouse-wheel or trackpad turn moves the target; the page then glides from where it is
     to the target over 1.5 s on an ease-out-expo curve, restarting the glide on every turn, so
     scrolling feels continuous and floaty instead of stepping.
     Touch, keyboard, the scrollbar and find-in-page stay native; the glide simply hands over to them.
     Sideways scrolling (the carousels) and boxes that scroll on their own also stay native. */
  const smooth = (() => {
    const DURATION = 1.5; // seconds per glide: longer = softer and floatier (Lenis default is 1.2)
    const ease = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)); // ease-out-expo, Lenis default
    const LINE = 100 / 6; // px per wheel "line" (Firefox reports lines, not pixels)
    let from = scrollY;
    let target = scrollY;
    let current = scrollY;
    let lastSet = scrollY;
    let elapsed = 0;
    let raf = 0;
    let last = 0;
    const limit = () => Math.max(0, root.scrollHeight - innerHeight);
    const clamp = (y) => Math.min(limit(), Math.max(0, y));
    const frame = (now) => {
      elapsed += last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 1 / 60;
      last = now;
      const p = Math.min(1, elapsed / DURATION);
      current = p === 1 ? target : from + (target - from) * ease(p);
      scrollTo(0, current);
      lastSet = scrollY;
      raf = p === 1 ? 0 : requestAnimationFrame(frame);
    };
    const to = (y) => {
      from = raf ? current : scrollY;
      target = clamp(y);
      elapsed = 0;
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const jump = (y) => {
      cancelAnimationFrame(raf);
      raf = 0;
      scrollTo(0, clamp(y));
      target = current = lastSet = scrollY;
    };
    // something else moved the page (scrollbar, keys, touch, focus): stop gliding and follow it
    addEventListener('scroll', () => {
      if (raf && Math.abs(scrollY - lastSet) > 1.5) { cancelAnimationFrame(raf); raf = 0; }
      if (!raf) target = current = lastSet = scrollY;
    }, { passive: true });
    // true if the wheel should move a box under the pointer rather than the page. Only the boxes
    // that can scroll up and down on their own are checked (cheap: no style reads per wheel turn);
    // mark any new one with data-native-scroll.
    const ownsWheel = (el, dy) => {
      const box = el.closest('[data-native-scroll], textarea, .mobile-menu');
      if (!box) return false;
      if (box.hasAttribute('data-native-scroll')) return true;
      return dy < 0 ? box.scrollTop > 0 : box.scrollTop + box.clientHeight < box.scrollHeight - 1;
    };
    addEventListener('wheel', (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.shiftKey || root.classList.contains('no-scroll')) return;
      const k = e.deltaMode === 1 ? LINE : e.deltaMode === 2 ? innerHeight : 1;
      const dy = e.deltaY * k;
      if (!dy || Math.abs(e.deltaX * k) > Math.abs(dy)) return;
      if (e.target instanceof Element && ownsWheel(e.target, dy)) return;
      e.preventDefault();
      to((raf ? target : scrollY) + dy);
    }, { passive: false });
    root.classList.add('has-smooth-scroll'); // CSS turns off native smooth scrolling, which would fight the glide
    return { to, jump };
  })();

  /* ---------- Same-page links (#get-a-quote, #main…): glide there, below the fixed header ----------
     The page stops below the top bar (scroll-padding-top), so the bar stays on screen for the whole glide and after
     it (holdBar, read by keepBar in "Header"): going down would otherwise hide it, and leave an empty strip where
     it was above the heading. The same goes for a page opened at a #link. The visitor's own next scroll, tap or key
     lets the bar move as usual again. */
  let holdBar = location.hash.length > 1;
  const releaseBar = () => { holdBar = false; };
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((t) => addEventListener(t, releaseBar, { passive: true, capture: true }));
  d.addEventListener('click', (e) => {
    const a = e.target instanceof Element && e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash.length < 2) return;
    const el = d.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    if (location.hash !== url.hash) history.pushState(null, '', url.hash);
    const offset = (parseFloat(getComputedStyle(root).scrollPaddingTop) || 0) + (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
    const y = el.getBoundingClientRect().top + scrollY - offset;
    const keyboard = e.detail === 0; // Enter on a link: jump and move focus, like a normal link
    holdBar = true;
    if (keyboard || reduceMotion) smooth.jump(y); else smooth.to(y);
    if (keyboard) {
      if (!el.matches('a[href], button, input, select, textarea, [tabindex]')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  });

  /* ---------- Header ---------- */
  const header = $('[data-header]');
  const hero = $('[data-hero]');
  const actionbar = $('[data-actionbar]');
  const fab = $('[data-fab]');
  const devpill = $('[data-devpill]');
  if (devpill && !$('.ph')) devpill.remove(); // the "Sample data" switch only shows on pages with placeholders left
  let menuOpen = false;
  /* Desktop (mouse, 1024px and wider): the top bar moves with the page, like Twitter's: scrolling down pushes it up
     out of view pixel for pixel, scrolling up pulls it back down. It never flips between two states, so fast changes
     of direction can't make it jump. Once scrolling stops, a half-shown bar waits a moment, then
     eases the rest of the way: fully back if you were heading up, fully away if you were heading down.
     Phones and tablets (touch screens, and any screen under 1024px): the bar slides fully away once you have scrolled
     TURN px down, and fully back once you have scrolled TURN px up; a CSS transition does the slide (.is-snap in
     styles.css). Phones scroll the page on a separate thread, and scroll events reach the page's script a frame or
     more late, so a fixed bar that script moved on every scroll event was drawn behind the page and jittered against
     it, worst during a flick's momentum and while the browser's toolbars slid away. */
  const HIDE_FROM = 600; // px: over the hero the bar always stays
  const SETTLE_DELAY = 180; // ms of stillness before a half-shown bar finishes its slide (desktop)
  const TURN = 10; // px in one direction before the bar slides out or back (phones and tablets): wobbles do nothing
  /* Phones and tablets with the see-through bar (version 1): the bar used to turn white as soon as the page moved,
     yet stay on screen for the first 600px. A flick covers 600px in a fraction of a second, so a white bar flashed
     up and vanished. Now, on those screens, the bar slides away from the very top (after TURN px), still
     see-through, and only turns white when it comes back (you scroll up) or once the hero is off the screen.
     The floating bar is white all the time (--bar: float in css/site/05-header.css), so it keeps the
     600px rule everywhere. */
  const floatBar = getComputedStyle(header).getPropertyValue('--bar').trim() === 'float';
  const smallQ = matchMedia('(max-width: 1023.98px)');
  const snapMode = () => smallQ.matches || !finePointer; // phones and tablets: slide fully in or out (see above)
  let revealed = false; // brought back by scrolling up, since the page was last at the top
  let barH = header.offsetHeight + 8; // + room for its shadow
  // the hero's height is kept here (updated when it changes), so scrolling never has to measure the page
  let heroH = hero ? hero.offsetHeight : 0;
  let heroEnd = heroH - header.offsetHeight; // past this, the bar is over the page, not the hero
  if (hero && 'ResizeObserver' in window) new ResizeObserver(() => { heroH = hero.offsetHeight; heroEnd = heroH - header.offsetHeight; }).observe(hero);
  let offset = 0; // how far the bar is pushed up: 0 (shown) … barH (hidden)
  addEventListener('resize', () => {
    const hidden = offset > 0 && offset >= barH - 0.5;
    barH = header.offsetHeight + 8;
    heroH = hero ? hero.offsetHeight : 0;
    heroEnd = heroH - header.offsetHeight;
    if (hidden && offset !== barH) { stopSlide(); placeBar(barH); } // the bar's height changed: keep it fully away
  });
  let lastY = Math.max(0, scrollY);
  let lastDir = 0; // the way the page last moved: 1 down, -1 up
  let turnY = lastY; // where the page was when it last changed direction (phones and tablets)
  let lastW = innerWidth;
  let lastH = innerHeight;
  let menuHeld = false; // the phone menu was open (it locks the page, and puts it back where it was when it closes)
  let settleTimer = 0;
  let tween = 0;
  let tweenTo = -1;
  const placeBar = (v) => {
    offset = v;
    header.style.transform = v > 0.05 ? `translate3d(0, ${(-v).toFixed(2)}px, 0)` : '';
    header.classList.toggle('is-hidden', v >= barH - 0.5);
  };
  const slideBar = (to) => { // ease the bar fully in (0) or fully out (barH)
    if (tweenTo === to || offset === to) return;
    cancelAnimationFrame(tween);
    tweenTo = to;
    const from = offset;
    const dur = 320;
    let start = 0;
    const step = (now) => {
      start = start || now;
      const p = Math.min(1, (now - start) / dur);
      placeBar(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) tween = requestAnimationFrame(step); else tweenTo = -1;
    };
    tween = requestAnimationFrame(step);
  };
  const stopSlide = () => { cancelAnimationFrame(tween); tweenTo = -1; };
  // phones and tablets: the bar goes fully away (true) or fully back (false) at once; the CSS transition eases it
  const snapBar = (hide) => {
    const to = hide ? barH : 0;
    if (offset === to && tweenTo < 0) return;
    stopSlide();
    placeBar(to);
  };
  const showBar = () => {
    clearTimeout(settleTimer);
    if (snapMode()) snapBar(false); else slideBar(0);
  };
  // The bar stays while the Services menu is open, however it was opened: a click (.is-open), keyboard focus, or the
  // pointer resting on it (CSS :hover). The hover case was missing (23 Nov, user report): scrolling with the pointer on
  // the open menu slid the bar away, and the menu, which hangs from the bar, stayed on screen without it.
  const keepBar = () => holdBar || menuOpen || !!$('.nav__item.is-open') || !!$('.nav__item--menu:hover:not(.is-shut)', header) || !!$(':focus-visible', header);
  header.addEventListener('focusin', showBar);
  const onScroll = () => {
    // The phone menu locks the page while it is open and puts it back where it was when it closes. Neither is the
    // visitor scrolling: the bar stays shown, and the first frame after the menu only takes the page's new position.
    if (menuOpen) { menuHeld = true; showBar(); return; }
    const w = innerWidth;
    const h = innerHeight;
    const max = Math.max(0, root.scrollHeight - h);
    const y = Math.min(max, Math.max(0, scrollY)); // ignore rubber-band overscroll on phones
    let dy = y - lastY;
    lastY = y;
    const snap = snapMode();
    header.classList.toggle('is-snap', snap);
    // The browser's toolbars sliding away or back change the screen's height, and at the foot of the page they move
    // the page too. On such a frame a move against the way the visitor is scrolling is the toolbars, not them, so it
    // is skipped (desktop: a resized window moves nothing).
    const resized = w !== lastW || h !== lastH;
    lastW = w;
    lastH = h;
    if (menuHeld) { menuHeld = false; turnY = y; dy = 0; }
    else if (resized && dy && (!snap || Math.sign(dy) !== lastDir)) { turnY += dy; dy = 0; }
    if (dy && Math.sign(dy) !== lastDir) { lastDir = Math.sign(dy); turnY = y - dy; } // turned: measure from here
    const early = smallQ.matches && !floatBar; // phones and tablets, version 1
    if (keepBar() || y < (early ? 1 : HIDE_FROM)) {
      showBar();
      turnY = y;
    } else if (snap) {
      // out once you have gone TURN px down, back once you have gone TURN px up (and white then, version 1)
      if (dy && Math.abs(y - turnY) >= TURN) {
        if (lastDir < 0) revealed = true;
        snapBar(lastDir > 0);
      }
    } else if (dy) {
      clearTimeout(settleTimer);
      stopSlide();
      placeBar(Math.min(barH, Math.max(0, offset + dy)));
      if (offset > 0 && offset < barH) {
        settleTimer = setTimeout(() => {
          // follow the last direction, unless the bar only moved a few pixels that way (a wobble)
          const towardHidden = lastDir > 0 ? offset > 12 : barH - offset <= 12;
          slideBar(towardHidden ? barH : 0);
        }, SETTLE_DELAY);
      }
    }
    if (y <= 24) revealed = false;
    // version 1 on phones: past the hero the bar is white, but one already sliding away keeps its look (a flick
    // carries the page past the hero before the slide is over, and the bar turned white on its way out)
    const away = offset >= barH - 0.5 && !header.classList.contains('is-solid');
    header.classList.toggle('is-solid', y > 24 && (!early || revealed || keepBar() || (y > heroEnd && !away)));
    const pastHero = y > (hero ? heroH - 160 : 240);
    actionbar && actionbar.classList.toggle('is-visible', pastHero);
    fab && fab.classList.toggle('is-visible', pastHero);
    // Phones and tablets: the WhatsApp bubble sat over the right end of the text while you read. It now goes with the
    // top bar: away while you scroll down, back as soon as you scroll up (the action bar, with call and quote, stays).
    fab && fab.classList.toggle('is-tucked', snap && offset >= barH - 0.5);
    devpill && devpill.classList.toggle('is-visible', pastHero);
  };
  scrollFns.push(onScroll);
  onScroll();

  /* ---------- Services mega menu ---------- */
  $$('[data-menu-trigger]').forEach((btn) => {
    const item = btn.closest('.nav__item');
    // shut: closed on purpose (second click, Escape). The CSS also opens the menu on hover and keyboard focus, which
    // used to hold it open after a second click on Services; .is-shut overrides both until the pointer leaves
    // One highlight glides between the service rows (css: .mega__list::before). Its row is .is-active until the
    // pointer reaches another row, so the gaps between rows change nothing; it fades once the pointer leaves the list.
    const list = $('.mega__list', item);
    // The feature card shows the service row last pointed at or focused (23 Nov, user request): one slide per row, in
    // the same order, and the card's link goes to that service. It stays on that row while the pointer crosses over to
    // the card, and goes back to the first once the menu has closed. Its other photos load the first time it opens.
    const feat = $('[data-mega-feature]', item);
    const slides = feat ? $$('.mega__slide', feat) : [];
    const links = list ? $$('.mega__link', list) : [];
    let resetT = 0;
    const show = (link) => {
      const i = links.indexOf(link);
      if (i < 0 || !slides[i]) return;
      slides.forEach((s, n) => s.classList.toggle('is-on', n === i));
      feat.setAttribute('href', link.getAttribute('href'));
    };
    const wake = () => {
      clearTimeout(resetT);
      if (feat) $$('img[data-src]', feat).forEach((im) => { im.srcset = im.dataset.srcset; im.src = im.dataset.src; delete im.dataset.src; delete im.dataset.srcset; });
    };
    const later = () => { clearTimeout(resetT); resetT = setTimeout(() => show(links[0]), 450); }; // after the .1 s wait and .2 s fade
    let row = null;
    const mark = (link) => {
      if (link) show(link);
      if (!list || link === row) return;
      if (row) row.classList.remove('is-active');
      if (link) {
        // the highlight has faded out: show it on this row instead of gliding in from the last one
        const snap = !row && parseFloat(getComputedStyle(list, '::before').opacity) < 0.05;
        if (snap) list.classList.add('hl-snap');
        list.style.setProperty('--hl-y', `${link.offsetTop}px`);
        list.style.setProperty('--hl-h', `${link.offsetHeight}px`);
        if (snap) { void list.offsetWidth; list.classList.remove('hl-snap'); }
        link.classList.add('is-active');
      }
      list.classList.toggle('has-hl', !!link);
      row = link;
    };
    if (list) {
      list.addEventListener('pointerover', (e) => { const a = e.target.closest('.mega__link'); if (a) mark(a); });
      list.addEventListener('pointerleave', () => mark(list.querySelector('.mega__link:focus-visible')));
      list.addEventListener('focusin', (e) => { if (e.target.matches('.mega__link:focus-visible')) mark(e.target); });
      list.addEventListener('focusout', (e) => { if (!list.contains(e.relatedTarget) && !list.matches(':hover')) mark(null); });
    }
    // aria-expanded says whether the menu is showing, however it opened: the CSS also opens it on hover and on keyboard
    // focus, which used to leave the button saying "collapsed" over an open menu (found in the 24 Nov site check)
    const showing = () => {
      if (item.classList.contains('is-shut')) return false;
      if (item.classList.contains('is-open') || item.matches(':hover')) return true;
      try { return item.matches(':has(:focus-visible)'); } catch { return false; }
    };
    const sync = () => btn.setAttribute('aria-expanded', String(showing()));
    const set = (open, shut = false) => {
      item.classList.toggle('is-open', open);
      item.classList.toggle('is-shut', shut);
      sync();
      if (!open) { mark(null); later(); }
    };
    btn.addEventListener('click', () => { const open = !item.classList.contains('is-open'); set(open, !open); });
    item.addEventListener('pointerenter', () => { wake(); sync(); });
    item.addEventListener('focusin', () => { wake(); sync(); });
    item.addEventListener('mouseleave', () => set(false));
    item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) { item.classList.remove('is-shut'); if (!item.matches(':hover')) later(); setTimeout(sync); } });
    d.addEventListener('click', (e) => { if (!item.contains(e.target)) set(false); });
    item.addEventListener('keydown', (e) => { if (e.key === 'Escape') { set(false, true); btn.focus(); } });
  });

  /* ---------- Mobile menu ----------
     It fits the screen without scrolling: its sizes follow its height (see the "Mobile menu" CSS), which is measured
     here into --mm-h when it opens and on resize; .is-tall lets it scroll only if it still can't fit.
     While it is open the page behind is locked without moving it: html.no-scroll (overflow: hidden) stops the wheel,
     the keys and, on Android and iOS 16+, touch scrolling, and touch drags are cancelled as well, because older iOS
     Safari and Chrome on iOS still scroll or rubber-band the page under a fixed overlay. scrollY never changes, so on
     close there is nothing to restore: the header, the glide and the scroll effects never see the page move. */
  const mm = $('[data-mobile-menu]');
  const openBtn = $('[data-menu-open]');
  const closeBtn = $('[data-menu-close]');
  const fitMenu = () => {
    mm.style.setProperty('--mm-h', `${mm.clientHeight}px`);
    mm.classList.remove('is-tall');
    // the height the content needs with no space above the foot (offsets ignore the opening slide's translate);
    // landscape (grid): the foot sits beside the links, under the top row
    const [top, nav, foot] = mm.children;
    const links = nav.lastElementChild;
    const navEnd = links.offsetTop + links.offsetHeight + parseFloat(getComputedStyle(nav).paddingBottom);
    const footEnd = (getComputedStyle(mm).display === 'grid' ? top.offsetTop + top.offsetHeight : navEnd) + foot.offsetHeight;
    mm.classList.toggle('is-tall', Math.max(navEnd, footEnd) + parseFloat(getComputedStyle(mm).paddingBottom) > mm.clientHeight + 1);
  };
  let touchY = 0;
  const onTouchStart = (e) => { touchY = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (e.touches.length > 1 || !e.cancelable) return; // pinch zoom stays available
    const dy = e.touches[0].clientY - touchY;
    const inMenu = mm.classList.contains('is-tall') && mm.contains(e.target); // only a menu too tall to fit scrolls, up to its ends
    if (!inMenu || (dy > 0 && mm.scrollTop <= 0) || (dy < 0 && mm.scrollTop + mm.clientHeight >= mm.scrollHeight - 1)) e.preventDefault();
  };
  const setMenu = (open) => {
    menuOpen = open;
    openBtn.setAttribute('aria-expanded', String(open));
    root.classList.toggle('no-scroll', open);
    const listen = open ? 'addEventListener' : 'removeEventListener';
    d[listen]('touchstart', onTouchStart, { passive: true });
    d[listen]('touchmove', onTouchMove, { passive: false });
    if (open) {
      mm.hidden = false;
      mm.scrollTop = 0;
      fitMenu();
      requestAnimationFrame(() => requestAnimationFrame(() => mm.classList.add('is-open')));
      setTimeout(() => closeBtn.focus(), 50);
    } else {
      mm.classList.remove('is-open');
      setTimeout(() => { if (!menuOpen) mm.hidden = true; }, reduceMotion ? 320 : 600);
      openBtn.focus();
    }
  };
  if (mm && openBtn) {
    openBtn.addEventListener('click', () => setMenu(true));
    closeBtn.addEventListener('click', () => setMenu(false));
    mm.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenu(false);
      if (e.key === 'Tab') { // keep focus inside the dialog
        const f = $$('a, button', mm).filter((el) => el.offsetParent !== null);
        if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    $$('a', mm).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });
    addEventListener('resize', () => { if (menuOpen) fitMenu(); }); // turning the phone, toolbars showing or hiding
  }

  /* ---------- Ramadan, Hajj and the Umrah season: today's dates (seasons.js) ----------
     seasons.js works them out from the Islamic calendar, so they move on by themselves. The pages are built with the
     dates of the build day ({{season}} in build.mjs); here every [data-season] text and the page title are brought up to
     the visitor's day, so a page built months ago still names the coming Ramadan and the current Umrah season. A browser
     without the Islamic calendar keeps the built text. */
  const SEASON = window.MarjanSeasons || { ok: false, text: () => '', hajjMonth: () => false };
  if (SEASON.ok) {
    const built = $('[data-season="season"]');
    const was = built && built.textContent;
    $$('[data-season]').forEach((el) => { el.textContent = SEASON.text(el.dataset.season) || el.textContent; });
    if (was && SEASON.text('season') !== was) d.title = d.title.split(was).join(SEASON.text('season')); // "Umrah Packages 2026–27"
  }
  const ramadanYear = SEASON.text('ramadan-year') || ($('[data-season="ramadan-year"]') || {}).textContent || '';
  const RAMADAN_PKG = `Ramadan Umrah ${ramadanYear}`.trim(); // the hero's package
  const RAMADAN_WHEN = `Ramadan ${ramadanYear}`.trim(); // "When" for it (short: the phone field is ~140px)

  /* ---------- "When" lists (hero planner and quote form): Flexible plus the next 12 months ----------
     Umrah follows two dates of the Islamic calendar, so the list follows the package:
     - Ramadan Umrah: Ramadan is one month (29 or 30 days), so "When" is set to it and locked; there is no month to pick.
     - Any other Umrah: the months around Hajj, when Saudi Arabia stops Umrah visas, are listed but can't be picked
       (SEASON.hajjMonth: at least half the month from 1 Dhul Qadah to 14 Dhul Hijjah; see seasons.js).
     Both are the calendar's expected dates (the moon sighting can move them a day). */
  const fmtMonth = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
  const monthKind = (text) => (/ramadan/i.test(text) ? 'ramadan' : /umrah/i.test(text) ? 'umrah' : 'any');
  const builtMonths = new WeakMap();
  const travelMonths = (select, kind = 'any') => {
    select.toggleAttribute('data-locked', kind === 'ramadan'); // the custom dropdown below turns this into a fixed field
    let html = `<option selected>${RAMADAN_WHEN}</option>`;
    if (kind !== 'ramadan') {
      const now = window.MarjanSeasonsToday || new Date(); // the test day, if seasons.js is being tested
      html = '<option>Flexible</option>' + Array.from({ length: 12 }, (_, i) => {
        const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
        return kind === 'umrah' && SEASON.hajjMonth(m.getFullYear(), m.getMonth())
          ? `<option disabled>${fmtMonth.format(m)} · Hajj season</option>` : `<option>${fmtMonth.format(m)}</option>`;
      }).join('');
    }
    if (builtMonths.get(select) === html) return; // same list: leave the visitor's pick alone
    builtMonths.set(select, html);
    const keep = select.value;
    select.innerHTML = html;
    const o = [...select.options].find((x) => x.value === keep && !x.disabled); // keep a month that is still there
    if (o) o.selected = true;
  };

  /* ==========================================================================
     HERO — journey picker (auto-plays until the visitor takes over)
     ========================================================================== */
  if (hero) {
    const JOURNEYS = {
      umrah: {
        name: 'Umrah', label: 'Package', caption: 'Masjid al-Haram, Makkah', travellers: 2,
        // the package types on the Umrah page (tools/umrah.mjs TYPES), so both pages offer the same packages
        options: ['Economy Umrah', '4-Star Umrah', '5-Star & VIP Umrah', 'Family Umrah', 'Group Umrah', RAMADAN_PKG, 'Custom Umrah package'], selected: 1,
      },
      north: {
        name: 'Pakistan tour', label: 'Destination', caption: 'Hunza Valley, Gilgit-Baltistan', travellers: 2,
        options: ['Skardu', 'Naran Kaghan', 'Murree', 'Kashmir', 'Swat', 'Gilgit', 'Help me choose'],
      },
      abroad: {
        name: 'International holiday', label: 'Destination', caption: 'Dubai skyline, United Arab Emirates', travellers: 2,
        options: ['Azerbaijan', 'Thailand', 'Indonesia (Bali)', 'Malaysia', 'Dubai', 'Sri Lanka', 'Singapore', 'Somewhere else'],
      },
      visa: {
        name: 'Visa', label: 'Visa for', caption: 'Visit, tourist, family & business visas', travellers: 1,
        options: ['Dubai & UAE', 'Azerbaijan', 'Thailand', 'Indonesia', 'Malaysia', 'Sri Lanka', 'Singapore', 'USA (visa file)', 'UK (visa file)', 'Canada (visa file)', 'Schengen (visa file)', 'Another country'],
      },
      corporate: {
        name: 'Corporate trip', label: 'Trip type', caption: 'Team retreats & incentive tours', travellers: 20,
        options: ['Company trip in Pakistan', 'Company trip abroad', 'Team-building retreat', 'Incentive tour', 'Conference', 'Group Umrah for employees'],
      },
    };

    const slides = $$('.hero__slide', hero);
    const tabs = $$('[data-journey]', hero);
    const sets = $$('.float-set', hero);
    const planner = $('[data-planner]', hero);
    const form = $('[data-planner-form]', hero);
    const optSel = $('[data-option]', hero);
    const optLabel = $('[data-option-label]', hero);
    const monthSel = $('[data-month]', hero);
    const trav = $('[data-travellers]', hero);
    const journeyInput = $('[data-journey-input]', hero);
    const caption = $('[data-caption]', hero);
    const keys = tabs.map((t) => t.dataset.journey);
    const DURATION = Number(hero.dataset.duration) || 6000; // ms on each journey (data-duration overrides); the active tab fills with 10% brand blue over this time

    let idx = 0;
    let engaged = false;
    let travTouched = false;
    let inView = true;
    let hoverPause = false;
    let userPaused = false;
    const pauseBtn = $('[data-autoplay-toggle]', hero);
    let elapsed = 0;
    let last = performance.now();

    // the package list in the HTML names the Ramadan of the build day: bring it up to today's
    [...optSel.options].forEach((o) => { if (/^Ramadan Umrah/.test(o.text)) o.text = RAMADAN_PKG; });
    // "When": follows the package (Ramadan Umrah fixes it; other Umrah can't pick the Hajj months), see above
    const syncMonths = () => travelMonths(monthSel, monthKind(optSel.value));
    syncMonths();
    optSel.addEventListener('change', syncMonths);

    const loadSlide = (s) => {
      const img = s && $('img[data-srcset]', s);
      if (!img) return;
      img.srcset = img.dataset.srcset;
      img.src = img.dataset.src;
      img.removeAttribute('data-srcset');
    };

    const setTrav = (n) => {
      const v = Math.max(1, Math.min(500, Number(n) || 1));
      trav.value = v;
      $('[data-step="-1"]', hero).disabled = v <= 1;
    };

    const go = (i, auto = false) => { // auto: the timer moved on by itself (not a click, key or swipe)
      i = (i + keys.length) % keys.length;
      idx = i;
      const key = keys[i];
      const j = JOURNEYS[key];
      slides.forEach((s) => {
        const on = s.dataset.slide === key;
        if (on) loadSlide(s);
        s.classList.toggle('is-active', on);
      });
      tabs.forEach((t, k) => {
        t.classList.toggle('is-active', k === i);
        t.setAttribute('aria-pressed', String(k === i));
        t.style.setProperty('--p', 0);
      });
      sets.forEach((s) => s.classList.toggle('is-active', s.dataset.set === key));
      const cap = slides.find((s) => s.dataset.slide === key)?.dataset.caption || j.caption; // a slide's data-caption wins
      if (caption) {
        caption.parentElement.classList.add('is-swapping');
        setTimeout(() => { caption.textContent = cap; caption.parentElement.classList.remove('is-swapping'); }, 250);
      }
      optLabel.textContent = j.label;
      optSel.innerHTML = j.options.map((o, k) => `<option${k === (j.selected || 0) ? ' selected' : ''}>${o}</option>`).join('');
      syncMonths();
      journeyInput.value = j.name;
      if (!travTouched) setTrav(j.travellers);
      // keep the active chip visible in the horizontally scrolling tab row
      const row = tabs[i].parentElement;
      if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: tabs[i].offsetLeft - 8, behavior: reduceMotion ? 'auto' : 'smooth' });
      elapsed = 0;
      loadSlide(slides[(i + 1) % slides.length]); // warm the next image
      hero.dispatchEvent(new CustomEvent('journey', { detail: { key, index: i, auto } })); // site.js listens (videos)
    };

    const engage = () => {
      if (engaged) return;
      engaged = true;
      planner.classList.add('is-manual');
    };

    // Clicking a tab switches to it and restarts its timer; auto-play carries on from there.
    // Auto-play stops for good only once the visitor starts filling in the form (or presses pause).
    tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));
    planner.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(d.activeElement);
      if (i < 0 || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      e.preventDefault();
      const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[n].focus();
      go(n);
    });
    form.addEventListener('focusin', engage);
    form.addEventListener('pointerdown', engage);
    // hold the timer while the mouse is over the form, so options never change under the cursor
    form.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hoverPause = true; });
    form.addEventListener('pointerleave', () => { hoverPause = false; });

    $$('[data-step]', hero).forEach((b) => b.addEventListener('click', () => {
      travTouched = true;
      setTrav(Number(trav.value) + Number(b.dataset.step));
    }));
    trav.addEventListener('change', () => { travTouched = true; setTrav(trav.value); });
    setTrav(trav.value);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const j = JOURNEYS[keys[idx]];
      const n = Number(trav.value);
      const msg = [
        "Assalam o Alaikum Marjan Travel & Tours! I'd like a free quote.",
        '',
        `Trip: ${j.name} – ${optSel.value}`,
        `Travellers: ${n} ${n === 1 ? 'person' : 'people'}`,
        `When: ${monthSel.value}`,
        '',
        '(Sent from your website)',
      ].join('\n');
      window.open(waLink(msg), '_blank', 'noopener');
    });

    if (pauseBtn) pauseBtn.addEventListener('click', () => {
      userPaused = !userPaused;
      pauseBtn.classList.toggle('is-paused', userPaused);
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
    });

    // Autoplay with a progress bar on the active tab (crossfade only; no zoom when reduced motion is on)
    {
      const tick = (t) => {
        const dt = Math.min(t - last, 1000);
        last = t;
        const run = !engaged && inView && !hoverPause && !userPaused && !d.hidden;
        // Optional hook (site.js): hero.journeyClock(run) lets a background clip set the pace. It returns how far
        // the current journey is (0–1), or null to use the timer below.
        const clip = hero.journeyClock ? hero.journeyClock(run) : null;
        if (run) {
          elapsed += dt;
          const p = clip == null ? Math.min(elapsed / DURATION, 1) : clip;
          tabs[idx].style.setProperty('--p', p.toFixed(4));
          if (p >= 1) go(idx + 1, true);
        }
        if (!engaged) requestAnimationFrame(tick);
      };
      // start once the first image is in, so the hero never flashes
      const start = () => { loadSlide(slides[1]); last = performance.now(); requestAnimationFrame(tick); };
      if (d.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
    }

    new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.3 }).observe(hero);

    // Swipe between journeys on touch screens
    let sx = null;
    let sy = 0;
    hero.addEventListener('touchstart', (e) => {
      if (e.target.closest('select, input, button, a, .planner__tabs')) { sx = null; return; }
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    hero.addEventListener('touchend', (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { engage(); go(idx + (dx < 0 ? 1 : -1)); }
      sx = null;
    }, { passive: true });

    // Pointer parallax on the image and floating cards (a hero with data-no-parallax opts out: the hero videos)
    if (finePointer && !reduceMotion && !hero.hasAttribute('data-no-parallax')) {
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      const move = () => {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        hero.style.setProperty('--mx', cx.toFixed(4));
        hero.style.setProperty('--my', cy.toFixed(4));
        raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(move) : 0;
      };
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(move);
      });
      hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(move); });
    }
  }

  /* ---------- Services click a service, or it moves on by itself every 10 s ---------- */
  $$('[data-svx]').forEach((wrap) => {
    const items = $$('[data-svx-item]', wrap);
    const heads = items.map((it) => $('.svx__head', it));
    const pauseBtn = $('[data-svx-pause]', wrap);
    const DURATION = 10000;
    let idx = Math.max(0, items.findIndex((x) => x.classList.contains('is-active')));
    let elapsed = 0;
    let last = 0;
    let raf = 0;
    let inView = false;
    let kbFocus = false;
    let userPaused = false;

    const set = (i) => {
      idx = (i + items.length) % items.length;
      items.forEach((x, k) => {
        x.classList.toggle('is-active', k === idx);
        x.style.setProperty('--p', 0);
        heads[k].setAttribute('aria-expanded', String(k === idx));
      });
      elapsed = 0;
    };

    heads.forEach((h, k) => h.addEventListener('click', () => set(k)));

    // keyboard users get a still list while they tab through it
    wrap.addEventListener('focusin', (e) => { kbFocus = e.target.matches(':focus-visible'); });
    wrap.addEventListener('focusout', (e) => { if (!wrap.contains(e.relatedTarget)) kbFocus = false; });

    if (pauseBtn) pauseBtn.addEventListener('click', () => {
      userPaused = !userPaused;
      pauseBtn.classList.toggle('is-paused', userPaused);
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play services slideshow' : 'Pause services slideshow');
    });

    const tick = (t) => {
      const dt = Math.min(t - last, 1000);
      last = t;
      if (!userPaused && !kbFocus && !d.hidden) {
        elapsed += dt;
        const p = Math.min(elapsed / DURATION, 1);
        items[idx].style.setProperty('--p', p.toFixed(4));
        if (p >= 1) set(idx + 1);
      }
      raf = inView ? requestAnimationFrame(tick) : 0;
    };
    // only run while the section is on screen
    new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }, { threshold: 0.35 }).observe(wrap);
  });

  /* ---------- Destinations pick a place and the large photo changes ---------- */
  $$('[data-dsh]').forEach((box) => {
    const slides = $$('[data-dsh-slide]', box);
    const items = $$('[data-dsh-item]', box);
    const load = (s) => {
      const img = s && $('img[data-srcset]', s);
      if (!img) return;
      img.srcset = img.dataset.srcset;
      img.src = img.dataset.src;
      img.removeAttribute('data-srcset');
    };
    const set = (i) => {
      slides.forEach((s, k) => {
        if (k === i) load(s);
        s.classList.toggle('is-active', k === i);
      });
      items.forEach((b, k) => {
        b.classList.toggle('is-active', k === i);
        b.setAttribute('aria-pressed', String(k === i));
      });
      load(slides[(i + 1) % slides.length]); // warm the next photo
      // keep the chosen place visible in the phone swipe row
      const row = items[i].closest('ul');
      if (row.scrollWidth > row.clientWidth + 1) {
        row.scrollTo({ left: items[i].parentElement.offsetLeft - row.offsetLeft - 8, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    };
    items.forEach((b, k) => {
      b.addEventListener('click', () => set(k));
      b.addEventListener('pointerenter', () => load(slides[k]));
      b.addEventListener('focus', () => load(slides[k]));
    });
    // once the section is on screen, fetch the other photos in the background
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setTimeout(() => slides.forEach(load), 1200);
      }, { rootMargin: '200px 0px' });
      io.observe(box);
    }
  });

  /* ---------- Tabs (destinations) ---------- */
  $$('[data-tabs]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    const select = (t, focus) => {
      tabs.forEach((x) => {
        const on = x === t;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        const panel = d.getElementById(x.getAttribute('aria-controls'));
        panel.hidden = !on;
        if (on) {
          panel.classList.remove('is-entering');
          void panel.offsetWidth;
          panel.classList.add('is-entering');
          $$('[data-reveal]', panel).forEach((el) => el.classList.add('in'));
        }
      });
      list.style.setProperty('--i', tabs.indexOf(t));
      if (focus) t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const n = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1
          : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        select(tabs[n], true);
      });
    });
  });

  /* ---------- Get a quote form: emails the request to the team, or sends it on WhatsApp ----------
     "Send request" posts the details to FormSubmit (formsubmit.co), a free form-to-email service with no
     account or server code: it emails them to the address in the form's action (partials/home/quote.html), as a table.
     FormSubmit emails a new address once to activate the form; until that link is clicked nothing is delivered, and
     the visitor sees the error line and can use the WhatsApp button instead. "Send it on WhatsApp instead" opens
     WhatsApp with the same details filled in. Without JavaScript the form posts to FormSubmit's own page. */
  const quoteForm = $('[data-quote-form]');
  if (quoteForm) {
    // "When" follows the service: an Umrah package can't pick the Hajj months, and the Ramadan package (its note, put
    // in by "Get a quote") fixes it to Ramadan until that note is taken out of the notes box (see the "When" lists above)
    const month = $('[data-month-select]', quoteForm);
    const syncMonths = () => {
      const { service, notes } = quoteForm.elements;
      const auto = quoteForm.dataset.autoNote || '';
      const kind = service.value !== 'Umrah package' ? 'any'
        : auto && /ramadan/i.test(auto) && notes.value.includes(auto) ? 'ramadan' : 'umrah';
      travelMonths(month, kind);
    };
    syncMonths();
    quoteForm.elements.service.addEventListener('change', syncMonths);
    quoteForm.elements.notes.addEventListener('input', syncMonths);
    // the browser can put the service back on Back or a refresh, without a change event (see the dropdowns below)
    addEventListener('pageshow', syncMonths);
    const sendBtn = $('[data-quote-send]', quoteForm);
    const sendLabel = sendBtn && $('span', sendBtn);
    const sendText = sendLabel ? sendLabel.textContent : '';
    const status = $('[data-quote-status]', quoteForm);
    const say = (text, state = '') => { if (status) { status.textContent = text; status.dataset.state = state; } };
    const details = () => {
      const f = Object.fromEntries(new FormData(quoteForm));
      return { f, n: Math.max(1, Number(f.travellers) || 1) };
    };
    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!quoteForm.reportValidity() || (sendBtn && sendBtn.disabled)) return;
      const { f, n } = details();
      const payload = {
        _subject: f._subject,
        _template: 'table',
        _honey: f._honey || '',
        Name: f.name.trim(),
        'Phone / WhatsApp': f.phone.trim(),
        Service: f.service,
        When: f.month,
        Travellers: `${n} ${n === 1 ? 'person' : 'people'}`,
        'Departing from': f.city.trim() || '-',
        Notes: f.notes.trim() || '-',
      };
      if (sendBtn) sendBtn.disabled = true;
      if (sendLabel) sendLabel.textContent = 'Sending…';
      quoteForm.setAttribute('aria-busy', 'true');
      say('Sending your request…', 'busy');
      try {
        const res = await fetch(quoteForm.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || `HTTP ${res.status}`);
        const first = payload.Name.split(/\s+/)[0];
        quoteForm.reset();
        delete quoteForm.dataset.autoNote;
        $$('select', quoteForm).forEach((s) => s.dispatchEvent(new Event('change'))); // the custom dropdowns show the reset value
        say(`Thank you${first ? `, ${first}` : ''}! Your request has reached our team. We will call or WhatsApp you soon.`, 'sent');
      } catch (err) {
        say("Sorry, your request didn't go through. Please try again, or send it on WhatsApp instead.", 'error');
      } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (sendLabel) sendLabel.textContent = sendText;
        quoteForm.removeAttribute('aria-busy');
      }
    });
    const waBtn = $('[data-quote-wa]', quoteForm);
    if (waBtn) waBtn.addEventListener('click', () => {
      if (!quoteForm.reportValidity()) return;
      const { f, n } = details();
      const lines = [
        "Assalam o Alaikum Marjan Travel & Tours! I'd like a free quote.",
        '',
        `Name: ${f.name.trim()}`,
        `Phone: ${f.phone.trim()}`,
        `Service: ${f.service}`,
        `When: ${f.month}`,
        `Travellers: ${n} ${n === 1 ? 'person' : 'people'}`,
      ];
      if (f.city.trim()) lines.push(`Departing from: ${f.city.trim()}`);
      if (f.notes.trim()) lines.push('', f.notes.trim());
      lines.push('', '(Sent from your website)');
      window.open(waLink(lines.join('\n')), '_blank', 'noopener');
    });
  }

  /* ---------- Custom dropdowns: every <select> opens a styled list instead of the plain system one ----------
     The real <select> stays in the form (hidden) and keeps the value, so the form code, the
     WhatsApp messages and validation work as before. A button shows the chosen option; the list
     opens below it (or above, if there is no room). Keyboard: arrows, Home/End, Enter/Space,
     Escape, Tab, and typing the first letters of an option. */
  {
    const pop = d.createElement('div');
    pop.className = 'cselect-pop';
    pop.hidden = true;
    const list = d.createElement('ul');
    list.className = 'cselect-pop__list';
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    list.setAttribute('data-native-scroll', ''); // the smooth-scroll code leaves wheel scrolling in here alone
    pop.append(list);
    d.body.append(pop);
    const CHECK = '<svg class="i cselect-pop__check" aria-hidden="true"><use href="#i-check"/></svg>'; // the sprite's check, like every other icon
    let cur = null; // the dropdown that is open: { select, btn, anchor, hit, labelId }
    let active = -1;
    let typed = '';
    let typedAt = 0;
    const items = () => [...list.children];
    const pickable = (li) => li && li.getAttribute('aria-disabled') !== 'true'; // e.g. not "May 2027 · Hajj season"
    const move = (from, dir) => { // the next option that can be picked, going down (1) or up (-1)
      const all = items();
      for (let i = from + dir; i >= 0 && i < all.length; i += dir) if (pickable(all[i])) { setActive(i); return; }
    };
    const setActive = (i, reveal = true) => {
      const all = items();
      if (!all.length) return;
      active = Math.max(0, Math.min(all.length - 1, i));
      all.forEach((li, k) => li.classList.toggle('is-active', k === active));
      const li = all[active];
      list.setAttribute('aria-activedescendant', li.id);
      if (!reveal) return; // keep the option in view inside the list without moving the page
      if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop - 6;
      else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight + 6;
    };
    const place = () => {
      const r = cur.anchor.getBoundingClientRect();
      const vw = root.clientWidth;
      const w = Math.min(Math.max(r.width, 220), vw - 24);
      const left = Math.min(Math.max(12, r.left), vw - 12 - w);
      pop.style.width = `${w}px`;
      pop.style.left = `${left + scrollX}px`;
      const h = pop.offsetHeight;
      const below = innerHeight - r.bottom;
      const up = below < h + 16 && r.top > below;
      pop.classList.toggle('is-up', up);
      pop.style.top = `${(up ? r.top - h - 8 : r.bottom + 8) + scrollY}px`;
    };
    const close = (refocus = true) => {
      if (!cur) return;
      const c = cur;
      cur = null;
      pop.hidden = true;
      c.btn.setAttribute('aria-expanded', 'false');
      c.anchor.classList.remove('is-open');
      if (refocus) c.btn.focus({ preventScroll: true });
    };
    const open = (c) => {
      if (cur) close(false);
      cur = c;
      list.innerHTML = '';
      [...c.select.options].forEach((o, k) => {
        if (o.hidden || (o.disabled && o.value === '')) return; // e.g. the "Choose a service" prompt
        const li = d.createElement('li');
        li.id = `${c.btn.id}-o${k}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(k === c.select.selectedIndex));
        if (o.disabled) li.setAttribute('aria-disabled', 'true'); // listed, but can't be picked
        li.dataset.index = k;
        li.innerHTML = `<span></span>${CHECK}`;
        li.firstChild.textContent = o.text;
        list.append(li);
      });
      list.setAttribute('aria-labelledby', c.labelId || c.btn.id);
      pop.hidden = false;
      place();
      c.btn.setAttribute('aria-expanded', 'true');
      c.anchor.classList.add('is-open');
      const sel = items().findIndex((li) => li.getAttribute('aria-selected') === 'true');
      if (sel >= 0) setActive(sel); else move(-1, 1);
      list.focus({ preventScroll: true });
    };
    const choose = (li) => {
      const c = cur;
      const k = Number(li.dataset.index);
      close(true);
      if (c.select.selectedIndex === k) return;
      c.select.selectedIndex = k;
      c.select.dispatchEvent(new Event('input', { bubbles: true }));
      c.select.dispatchEvent(new Event('change', { bubbles: true }));
    };
    list.addEventListener('pointermove', (e) => {
      const li = e.target.closest('[role="option"]');
      if (pickable(li)) setActive(items().indexOf(li), false);
    });
    list.addEventListener('click', (e) => {
      const li = e.target.closest('[role="option"]');
      if (pickable(li)) choose(li);
    });
    list.addEventListener('keydown', (e) => {
      const all = items();
      if (e.key === 'ArrowDown') move(active, 1);
      else if (e.key === 'ArrowUp') move(active, -1);
      else if (e.key === 'Home' || e.key === 'PageUp') move(-1, 1);
      else if (e.key === 'End' || e.key === 'PageDown') move(all.length, -1);
      else if (e.key === 'Enter' || e.key === ' ') { if (pickable(all[active])) choose(all[active]); }
      else if (e.key === 'Escape') close(true);
      else if (e.key === 'Tab') { close(true); return; } // focus then moves on from the button, as with a normal select
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const now = Date.now();
        typed = now - typedAt > 700 ? e.key.toLowerCase() : typed + e.key.toLowerCase();
        typedAt = now;
        const from = typed.length === 1 ? active + 1 : active;
        for (let s = 0; s < all.length; s++) {
          const i = (from + s) % all.length;
          if (pickable(all[i]) && all[i].textContent.trim().toLowerCase().startsWith(typed)) { setActive(i); break; }
        }
      } else return;
      e.preventDefault();
    });
    d.addEventListener('pointerdown', (e) => { if (cur && !pop.contains(e.target) && !cur.hit.contains(e.target)) close(false); });
    addEventListener('resize', () => close(false));
    addEventListener('blur', () => close(false));

    let uid = 0;
    $$('select').forEach((select) => {
      const wrap = select.parentElement; // .planner__control or .field__select
      const label = select.closest('label');
      const labelText = label && $('.planner__label, .field__label', label);
      const btn = d.createElement('button');
      btn.type = 'button';
      btn.className = 'cselect';
      btn.id = `cselect-${++uid}`;
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');
      const value = d.createElement('span');
      value.className = 'cselect__value';
      btn.append(value);
      if (labelText) {
        labelText.id = labelText.id || `${btn.id}-label`;
        btn.setAttribute('aria-labelledby', `${labelText.id} ${btn.id}`);
      }
      select.before(btn); // first in the <label>, so clicking the label opens the list
      select.classList.add('cselect__native');
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');
      const anchor = select.closest('.planner__field') || wrap;
      const c = { select, btn, anchor, hit: label || anchor, labelId: labelText && labelText.id };
      const error = d.createElement('span');
      error.className = 'field__error';
      error.setAttribute('role', 'alert');
      const sync = () => {
        const o = select.options[select.selectedIndex];
        value.textContent = o ? o.text : '';
        const empty = !o || o.disabled || o.value === '';
        btn.classList.toggle('is-placeholder', empty);
        if (!empty) { wrap.classList.remove('is-invalid'); btn.removeAttribute('aria-invalid'); error.remove(); }
        // data-locked (e.g. "When" for a Ramadan package): the field shows its one value and can't be opened. The
        // hidden native select stays enabled, so the value is still sent with the form.
        const locked = select.hasAttribute('data-locked');
        if (locked && cur && cur.btn === btn) close(false);
        btn.disabled = locked;
        wrap.classList.toggle('is-locked', locked);
      };
      sync();
      select.addEventListener('change', sync);
      // Coming back with Back (Chrome, when it doesn't keep the page whole) or refreshing in Firefox, the browser puts
      // a typed-in form's choices back without a change event, so the button showed one service over another
      // (24 Nov site check). Chrome does it just before pageshow. The hero planner opts out (autocomplete="off").
      addEventListener('pageshow', sync);
      new MutationObserver(sync).observe(select, { // the hero swaps options; "When" can be locked
        childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-locked'],
      });
      btn.addEventListener('click', () => (cur && cur.btn === btn ? close(true) : open(c)));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(c); }
      });
      // A required dropdown left empty: show it in red with a message, instead of the browser's bubble
      select.addEventListener('invalid', (e) => {
        e.preventDefault();
        wrap.classList.add('is-invalid');
        btn.setAttribute('aria-invalid', 'true');
        error.textContent = select.dataset.error || 'Please choose an option.';
        (label || wrap).append(error);
        const first = select.form && [...select.form.elements].find((el) => el.willValidate && !el.validity.valid);
        if (first === select) btn.focus();
      });
    });
  }

  /* ---------- FAQ: one answer open at a time ----------
     <details name="faq"> does this natively in current browsers; this covers older ones. */
  const faqs = $$('details[name="faq"]');
  faqs.forEach((q) => q.addEventListener('toggle', () => {
    if (q.open) faqs.forEach((o) => { if (o !== q && o.open) o.open = false; });
  }));

  /* ---------- Swipe rows: one dot per scroll stop (7 reviews with 3 on screen = 5 dots) ---------- */
  $$('[data-scroller]').forEach((sc) => {
    const items = [...sc.children];
    const dots = d.createElement('div');
    dots.className = `dots dots--${sc.dataset.scroller}`;
    dots.setAttribute('aria-hidden', 'true');
    sc.after(dots);
    const update = () => {
      const max = sc.scrollWidth - sc.clientWidth;
      const step = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : 1;
      const stops = max <= 1 ? 1 : Math.min(items.length, Math.ceil(max / step - 0.05) + 1);
      if (dots.children.length !== stops) dots.innerHTML = '<span></span>'.repeat(stops);
      const i = sc.scrollLeft >= max - 2 ? stops - 1 : Math.round(sc.scrollLeft / step);
      [...dots.children].forEach((x, k) => x.classList.toggle('on', k === i));
      dots.hidden = stops < 2;
    };
    sc.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    addEventListener('resize', update);
    update();
  });

  /* ---------- Reviews carousel: previous / next ---------- */
  const rvTrack = $('[data-rv-track]');
  if (rvTrack) {
    const prev = $('[data-rv-prev]');
    const next = $('[data-rv-next]');
    const stepBy = () => {
      const card = rvTrack.firstElementChild;
      return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(rvTrack).columnGap || 16) : rvTrack.clientWidth;
    };
    const state = () => {
      const max = rvTrack.scrollWidth - rvTrack.clientWidth - 2;
      prev.disabled = rvTrack.scrollLeft <= 2;
      next.disabled = rvTrack.scrollLeft >= max;
    };
    prev.addEventListener('click', () => rvTrack.scrollBy({ left: -stepBy(), behavior: reduceMotion ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => rvTrack.scrollBy({ left: stepBy(), behavior: reduceMotion ? 'auto' : 'smooth' }));
    // Under the cards: the dots, and on phones the two arrows either side of them
    const nav = prev.parentElement;
    const foot = d.createElement('div');
    foot.className = 'rv-foot';
    const dotsRow = rvTrack.nextElementSibling; // made by the swipe-row code above
    rvTrack.after(foot);
    if (dotsRow && dotsRow.classList.contains('dots')) foot.append(dotsRow);
    const phone = matchMedia('(max-width: 767.98px)');
    const placeArrows = () => {
      if (phone.matches) { foot.prepend(prev); foot.append(next); } else nav.append(prev, next);
    };
    placeArrows();
    phone.addEventListener('change', placeArrows);
    rvTrack.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
    });
    rvTrack.addEventListener('scroll', () => requestAnimationFrame(state), { passive: true });
    addEventListener('resize', state);
    state();
  }

  /* ---------- Phones and tablets: photos start downloading about three screens ahead ----------
     The browser's own lazy loading waits until a photo is roughly one screen away, so a fast flick reached photos
     that had not arrived yet and showed empty boxes. Here every lazy photo switches to loading at once when it is
     within three screens (only those: the page doesn't fetch everything up front). */
  if ('IntersectionObserver' in window && matchMedia('(max-width: 1023.98px)').matches) {
    const early = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.loading = 'eager';
      early.unobserve(e.target);
    }), { rootMargin: '300% 0px' });
    $$('img[loading="lazy"]').forEach((img) => early.observe(img));
  }

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
    // Phones and tablets: blocks start showing just before they scroll onto the screen (and fade in faster, CSS), so
    // a fast flick never lands on a section that is still blank. Desktop: once they are 8% onto the screen.
    const touchSize = matchMedia('(max-width: 1023.98px)').matches;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), touchSize ? { rootMargin: '0px 0px 15% 0px', threshold: 0 } : { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    $$('[data-reveal]').forEach((el) => io.observe(el));
  } else {
    $$('[data-reveal]').forEach((el) => el.classList.add('in'));
  }

  /* ---------- How it works: the plane glides along the route ----------
     Where the plane should be comes from where the line sits on the screen, not from the block's height: it
     leaves the first stop when the line is 85% of the way down the screen and lands on the last stop when the
     line's end is 35% from the top. That is half a screen of scrolling on desktop (flat line, three columns) and
     the line's length plus half a screen on phones (the line runs down the stacked steps), so the plane stays on
     the screen the whole way. It doesn't jump there: it glides after that point (damping with a 0.4 s time
     constant, the same at any frame rate), so a fast flick or a jump still reads as a smooth flight, and
     scrolling back rewinds it the same way. Each stop lights up when the plane on screen reaches it. CSS moves
     the plane and the blue fill with transforms only (--p and --run on the line). Every [data-steps] route on a page
     gets its own plane: the home page's three steps and the Umrah page's five visa rules.
     A route inside [data-pin] (the visa rules) whose first child is sticky (umrah.css, wide screens) follows the pin
     instead: the plane leaves the first stop as the section sticks and lands on the last as it lets go. SHOW steps
     fit side by side; once the plane passes the last of those, the track slides (--x, px) by the same amount as the
     plane moves on, so the plane holds its place on the screen while the last steps come in under it. */
  $$('[data-steps]').forEach((steps) => {
    const routeLine = $('.route__line', steps);
    if (!routeLine) return;
    const items = $$('.step', steps);
    const pin = steps.closest('[data-pin]');
    const stick = pin && pin.firstElementChild;
    const track = $('.route__track', steps);
    const SHOW = 3;
    let pinned = false;
    let stickTop = 0; // px from the top of the screen where the pinned panel stays
    let slide = 0; // how far the track moves to bring in the last steps
    const START = 0.85; // the line this far down the screen: the plane leaves the first stop
    const END = 0.35; // the line's end this far down the screen: the plane lands on the last stop
    const TAU = 0.4; // seconds the plane takes to cover ~63% of the way that is left
    // Pinned (the visa rules): the page itself already glides (smooth wheel above), so a second 0.4 s glide on top
    // made the slide trail behind the scroll. It follows the page closely instead, with just enough easing to stay soft.
    const TAU_PIN = 0.1;
    // Phones (steps stacked): the line runs from the first stop to the last one and no further. --tail is the last
    // step's height, so CSS ends the line at that step's stop; at[k] is where stop k sits along the line (0 → 1),
    // so each stop lights up as the plane reaches it, however long the text under each step is
    // Stops are measured by their centres, so a route whose stops sit mid-card (.route--down, the Domestic tips) lands
    // the plane on them too: --head-c / --tail-c are the first stop's centre from the top and the last one's from the bottom.
    let at = items.map((_, k) => k / (items.length - 1));
    const stopAt = (it) => { const s = $('.route__stop', it); return s ? s.offsetTop + s.offsetHeight / 2 : 0; };
    const measure = () => {
      const last = items[items.length - 1];
      steps.style.setProperty('--tail', `${last.offsetHeight}px`);
      steps.style.setProperty('--head-c', `${stopAt(items[0]).toFixed(1)}px`);
      steps.style.setProperty('--tail-c', `${(last.offsetHeight - stopAt(last)).toFixed(1)}px`);
      const mid = (it) => it.offsetTop + stopAt(it);
      const span = mid(last) - mid(items[0]);
      at = items.map((it, k) => (span > 1 ? (mid(it) - mid(items[0])) / span : k / (items.length - 1)));
      const box = routeLine.getBoundingClientRect();
      routeLine.style.setProperty('--run', `${Math.max(box.width, box.height).toFixed(1)}px`); // length of the line
      pinned = !!stick && getComputedStyle(stick).position === 'sticky';
      if (pinned) {
        // the panel's height lets CSS centre it on the screen (umrah.css "Visa rules"); the plane starts when it sticks
        pin.style.setProperty('--stick-h', `${stick.offsetHeight}px`);
        stickTop = parseFloat(getComputedStyle(stick).top) || 0;
      }
      slide = pinned && items.length > SHOW ? items[items.length - SHOW].offsetLeft - items[0].offsetLeft : 0;
      if (track && !slide) track.style.removeProperty('--x');
    };
    let shown = 0;
    let goal = 0;
    let raf = 0;
    let last = 0;
    let revealed = false;
    const paint = () => {
      routeLine.style.setProperty('--p', shown.toFixed(4));
      items.forEach((it, k) => it.classList.toggle('is-on', shown >= at[k] * 0.98 && shown > 0.01));
      if (track && slide) {
        const from = at[SHOW - 1];
        track.style.setProperty('--x', (slide * Math.min(1, Math.max(0, (shown - from) / (1 - from)))).toFixed(1));
      }
    };
    const frame = (now) => {
      const dt = last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 1 / 60;
      last = now;
      shown = goal + (shown - goal) * Math.exp(-dt / (pinned ? TAU_PIN : TAU));
      if (Math.abs(goal - shown) < 0.001) shown = goal; // under a pixel left: land, and stop the loop
      paint();
      raf = shown === goal ? 0 : requestAnimationFrame(frame);
    };
    const update = () => {
      const r = (pinned ? pin : routeLine).getBoundingClientRect();
      const vh = screenH; // steady while a phone's toolbars slide (see the top of this file)
      goal = pinned
        ? Math.min(1, Math.max(0, (stickTop - r.top) / Math.max(1, pin.offsetHeight - stick.offsetHeight)))
        : Math.min(1, Math.max(0, (vh * START - r.top) / (vh * (START - END) + r.height)));
      // the steps start fading in as soon as the line comes onto the screen (the usual reveal waits until a block
      // is 8% in on desktop), so their text is in place by the time the plane leaves the first stop
      if (!revealed && r.top < vh) { revealed = true; items.forEach((it) => it.classList.add('in')); }
      if (r.bottom < 0 || r.top > vh) { // off the screen: no need to fly there
        cancelAnimationFrame(raf);
        raf = 0;
        if (shown !== goal) { shown = goal; paint(); }
        return;
      }
      if (raf || shown === goal) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    measure();
    if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); update(); }).observe(steps);
    if (pin || !('ResizeObserver' in window)) addEventListener('resize', () => { measure(); update(); }); // the pin follows the window's height
    scrollFns.push(update);
    update();
  });

  /* ---------- Counters (run only on real numbers) ---------- */
  let sampleVersion = 0;
  const countUp = (el) => {
    const target = $('.ph', el) || el;
    const raw = target.textContent.trim();
    const num = parseFloat(raw.replace(/,/g, ''));
    if (Number.isNaN(num)) return;
    const decimals = (raw.split('.')[1] || '').length;
    const commas = raw.includes(',');
    const version = sampleVersion;
    const t0 = performance.now();
    const D = 1700;
    const step = (t) => {
      if (version !== sampleVersion) return;
      const k = Math.min(1, (t - t0) / D);
      const v = num * (1 - Math.pow(1 - k, 3));
      target.textContent = commas
        ? v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : v.toFixed(decimals);
      if (k < 1) requestAnimationFrame(step); else target.textContent = raw;
    };
    requestAnimationFrame(step);
  };
  const stats = $('[data-stats]');
  let statsSeen = false;
  if (stats) {
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      statsSeen = true;
      $$('[data-count]', stats).forEach(countUp);
      obs.disconnect();
    }, { threshold: 0.4 }).observe(stats);
  }

  /* ---------- DESIGN PREVIEW: sample-data switch (remove before launch) ---------- */
  const toggle = $('[data-sample-toggle]');
  const applySample = (on) => {
    sampleVersion += 1;
    root.classList.toggle('sample', on);
    $$('.ph').forEach((p) => {
      if (!('ph' in p.dataset)) p.dataset.ph = p.textContent;
      p.textContent = on && p.dataset.sample ? p.dataset.sample : p.dataset.ph;
    });
    try { localStorage.setItem('marjan-sample', on ? '1' : '0'); } catch (e) { /* storage blocked */ }
    if (on && statsSeen) $$('[data-count]', stats).forEach(countUp);
  };
  if (toggle) {
    let saved = false;
    try { saved = localStorage.getItem('marjan-sample') === '1'; } catch (e) { /* storage blocked */ }
    toggle.checked = saved;
    if (saved) applySample(true);
    toggle.addEventListener('change', () => applySample(toggle.checked));
  }
})();
