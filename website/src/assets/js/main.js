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
     Desktop windows have no sliding toolbars, so there both follow every resize. Version 2's MFX.vh() / svh() work
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

  /* ---------- Same-page links (#get-a-quote, #main…): glide there, below the fixed header ---------- */
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
     Version 2's floating bar is white all the time (--bar: float in css/v2/05-header.css), so it keeps the
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
  const keepBar = () => menuOpen || !!$('.nav__item.is-open') || !!$(':focus-visible', header);
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
    let row = null;
    const mark = (link) => {
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
    const set = (open, shut = false) => {
      item.classList.toggle('is-open', open);
      item.classList.toggle('is-shut', shut);
      btn.setAttribute('aria-expanded', String(open));
      if (!open) mark(null);
    };
    btn.addEventListener('click', () => { const open = !item.classList.contains('is-open'); set(open, !open); });
    item.addEventListener('mouseleave', () => set(false));
    item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) item.classList.remove('is-shut'); });
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

  /* ==========================================================================
     HERO — journey picker (auto-plays until the visitor takes over)
     ========================================================================== */
  if (hero) {
    const JOURNEYS = {
      umrah: {
        name: 'Umrah', label: 'Package', caption: 'Masjid al-Haram, Makkah', travellers: 2,
        options: ['Economy Umrah · 15 days', 'Standard Umrah · 21 days', 'Premium 5-Star Umrah · 14 days', 'Ramadan Umrah 2027', 'Custom Umrah package'], selected: 1,
      },
      north: {
        name: 'Pakistan tour', label: 'Destination', caption: 'Hunza Valley, Gilgit-Baltistan', travellers: 2,
        options: ['Hunza Valley', 'Skardu', 'Swat', 'Naran Kaghan', 'Murree & Galiyat', 'Neelum Valley', 'Fairy Meadows', 'Help me choose'],
      },
      abroad: {
        name: 'International holiday', label: 'Destination', caption: 'Cappadocia, Turkey', travellers: 2,
        options: ['Dubai', 'Turkey', 'Baku, Azerbaijan', 'Thailand', 'Malaysia', 'Maldives', 'Bali', 'Europe', 'Help me choose'],
      },
      visa: {
        name: 'Visa', label: 'Visa for', caption: 'Visit, tourist, family & business visas', travellers: 1,
        options: ['Dubai & UAE', 'United Kingdom', 'Schengen countries', 'Turkey', 'Thailand', 'Malaysia', 'Saudi Arabia', 'Another country'],
      },
      corporate: {
        name: 'Corporate trip', label: 'Trip type', caption: 'Team retreats & incentive tours', travellers: 20,
        options: ['Team-building retreat', 'Incentive tour', 'Conference', 'Group Umrah for employees', 'Company trip'],
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

    // Month options: flexible + the next 12 months
    const fmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
    const now = new Date();
    monthSel.innerHTML = '<option>Flexible</option>' + Array.from({ length: 12 }, (_, i) =>
      `<option>${fmt.format(new Date(now.getFullYear(), now.getMonth() + i, 1))}</option>`).join('');

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
      journeyInput.value = j.name;
      if (!travTouched) setTrav(j.travellers);
      // keep the active chip visible in the horizontally scrolling tab row
      const row = tabs[i].parentElement;
      if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: tabs[i].offsetLeft - 8, behavior: reduceMotion ? 'auto' : 'smooth' });
      elapsed = 0;
      loadSlide(slides[(i + 1) % slides.length]); // warm the next image
      hero.dispatchEvent(new CustomEvent('journey', { detail: { key, index: i, auto } })); // version 2 listens (videos)
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
        // Optional hook (version 2): hero.journeyClock(run) lets a background clip set the pace. It returns how far
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

    // Pointer parallax on the image and floating cards (a hero with data-no-parallax opts out: version 2's videos)
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

  /* ---------- Get a quote form sends the details to the team on WhatsApp ---------- */
  const quoteForm = $('[data-quote-form]');
  if (quoteForm) {
    const month = $('[data-month-select]', quoteForm);
    const fmtMonth = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
    const today = new Date();
    month.innerHTML = '<option>Flexible</option>' + Array.from({ length: 12 }, (_, i) =>
      `<option>${fmtMonth.format(new Date(today.getFullYear(), today.getMonth() + i, 1))}</option>`).join('');
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!quoteForm.reportValidity()) return;
      const f = Object.fromEntries(new FormData(quoteForm));
      const n = Math.max(1, Number(f.travellers) || 1);
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
    const CHECK = '<svg class="cselect-pop__check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    let cur = null; // the dropdown that is open: { select, btn, anchor, hit, labelId }
    let active = -1;
    let typed = '';
    let typedAt = 0;
    const items = () => [...list.children];
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
        if (o.disabled || o.hidden) return; // e.g. the "Choose a service" prompt
        const li = d.createElement('li');
        li.id = `${c.btn.id}-o${k}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(k === c.select.selectedIndex));
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
      setActive(sel >= 0 ? sel : 0);
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
      if (li) setActive(items().indexOf(li), false);
    });
    list.addEventListener('click', (e) => {
      const li = e.target.closest('[role="option"]');
      if (li) choose(li);
    });
    list.addEventListener('keydown', (e) => {
      const all = items();
      if (e.key === 'ArrowDown') setActive(active + 1);
      else if (e.key === 'ArrowUp') setActive(active - 1);
      else if (e.key === 'Home' || e.key === 'PageUp') setActive(0);
      else if (e.key === 'End' || e.key === 'PageDown') setActive(all.length - 1);
      else if (e.key === 'Enter' || e.key === ' ') { if (all[active]) choose(all[active]); }
      else if (e.key === 'Escape') close(true);
      else if (e.key === 'Tab') { close(true); return; } // focus then moves on from the button, as with a normal select
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const now = Date.now();
        typed = now - typedAt > 700 ? e.key.toLowerCase() : typed + e.key.toLowerCase();
        typedAt = now;
        const from = typed.length === 1 ? active + 1 : active;
        for (let s = 0; s < all.length; s++) {
          const i = (from + s) % all.length;
          if (all[i].textContent.trim().toLowerCase().startsWith(typed)) { setActive(i); break; }
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
      };
      sync();
      select.addEventListener('change', sync);
      new MutationObserver(sync).observe(select, { childList: true, subtree: true, characterData: true }); // the hero swaps options
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
     the plane and the blue fill with transforms only (--p and --run on the line). */
  const steps = $('[data-steps]');
  const routeLine = steps && $('.route__line', steps);
  if (routeLine) {
    const items = $$('.step', steps);
    const START = 0.85; // the line this far down the screen: the plane leaves the first stop
    const END = 0.35; // the line's end this far down the screen: the plane lands on the last stop
    const TAU = 0.4; // seconds the plane takes to cover ~63% of the way that is left
    // Phones (steps stacked): the line runs from the first stop to the last one and no further. --tail is the last
    // step's height, so CSS ends the line at that step's stop; at[k] is where stop k sits along the line (0 → 1),
    // so each stop lights up as the plane reaches it, however long the text under each step is
    let at = items.map((_, k) => k / (items.length - 1));
    const measure = () => {
      const last = items[items.length - 1];
      steps.style.setProperty('--tail', `${last.offsetHeight}px`);
      const span = last.offsetTop - items[0].offsetTop;
      at = items.map((it, k) => (span > 1 ? (it.offsetTop - items[0].offsetTop) / span : k / (items.length - 1)));
      const box = routeLine.getBoundingClientRect();
      routeLine.style.setProperty('--run', `${Math.max(box.width, box.height).toFixed(1)}px`); // length of the line
    };
    let shown = 0;
    let goal = 0;
    let raf = 0;
    let last = 0;
    let revealed = false;
    const paint = () => {
      routeLine.style.setProperty('--p', shown.toFixed(4));
      items.forEach((it, k) => it.classList.toggle('is-on', shown >= at[k] * 0.98 && shown > 0.01));
    };
    const frame = (now) => {
      const dt = last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 1 / 60;
      last = now;
      shown = goal + (shown - goal) * Math.exp(-dt / TAU);
      if (Math.abs(goal - shown) < 0.001) shown = goal; // under a pixel left: land, and stop the loop
      paint();
      raf = shown === goal ? 0 : requestAnimationFrame(frame);
    };
    const update = () => {
      const r = routeLine.getBoundingClientRect();
      const vh = screenH; // steady while a phone's toolbars slide (see the top of this file)
      goal = Math.min(1, Math.max(0, (vh * START - r.top) / (vh * (START - END) + r.height)));
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
    else addEventListener('resize', () => { measure(); update(); });
    scrollFns.push(update);
    update();
  }

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
