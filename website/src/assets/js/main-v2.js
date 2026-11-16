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
  $$('.nav__link[href], .mobile-menu a[href], .devpill a[href]').forEach((a) => {
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

  /* ---------- Header ---------- */
  const header = $('[data-header]');
  const hero = $('[data-hero]');
  const actionbar = $('[data-actionbar]');
  const fab = $('[data-fab]');
  const devpill = $('[data-devpill]');
  let lastY = scrollY;
  let menuOpen = false;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-solid', y > 24);
    header.classList.toggle('is-hidden', y > 700 && y > lastY + 2 && !menuOpen);
    if (y < lastY - 2) header.classList.remove('is-hidden');
    const pastHero = y > (hero ? hero.offsetHeight - 160 : 240);
    actionbar && actionbar.classList.toggle('is-visible', pastHero);
    fab && fab.classList.toggle('is-visible', pastHero);
    devpill && devpill.classList.toggle('is-visible', pastHero);
    lastY = y;
  };
  scrollFns.push(onScroll);
  onScroll();

  /* ---------- Services mega menu ---------- */
  $$('[data-menu-trigger]').forEach((btn) => {
    const item = btn.closest('.nav__item');
    const set = (open) => { item.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', () => set(!item.classList.contains('is-open')));
    item.addEventListener('mouseleave', () => set(false));
    d.addEventListener('click', (e) => { if (!item.contains(e.target)) set(false); });
    item.addEventListener('keydown', (e) => { if (e.key === 'Escape') { set(false); btn.focus(); } });
  });

  /* ---------- Mobile menu ---------- */
  const mm = $('[data-mobile-menu]');
  const openBtn = $('[data-menu-open]');
  const closeBtn = $('[data-menu-close]');
  const setMenu = (open) => {
    menuOpen = open;
    openBtn.setAttribute('aria-expanded', String(open));
    root.classList.toggle('no-scroll', open);
    if (open) {
      mm.hidden = false;
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
    const DURATION = 6000; // time on each journey; the active tab fills with 10% coral over this time

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

    const go = (i) => {
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
      if (caption) {
        caption.parentElement.classList.add('is-swapping');
        setTimeout(() => { caption.textContent = j.caption; caption.parentElement.classList.remove('is-swapping'); }, 250);
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
        if (!engaged && inView && !hoverPause && !userPaused && !d.hidden) {
          elapsed += dt;
          const p = Math.min(elapsed / DURATION, 1);
          tabs[idx].style.setProperty('--p', p.toFixed(4));
          if (p >= 1) go(idx + 1);
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

    // Pointer parallax on the image and floating cards
    if (finePointer && !reduceMotion) {
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

  /* ---------- Services (V2): click a service, or it moves on by itself every 10 s ---------- */
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

  /* ---------- Destinations (V2): pick a place and the large photo changes ---------- */
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

  /* ---------- Get a quote form (V2): sends the details to the team on WhatsApp ---------- */
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
    rvTrack.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
    });
    rvTrack.addEventListener('scroll', () => requestAnimationFrame(state), { passive: true });
    addEventListener('resize', state);
    state();
  }

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    $$('[data-reveal]').forEach((el) => io.observe(el));
  } else {
    $$('[data-reveal]').forEach((el) => el.classList.add('in'));
  }

  /* ---------- How it works: progress line ---------- */
  const steps = $('[data-steps]');
  if (steps) {
    const items = $$('.step', steps);
    const update = () => {
      const r = steps.getBoundingClientRect();
      const vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height * 0.85)));
      steps.style.setProperty('--p', p.toFixed(3));
      items.forEach((it, k) => it.classList.toggle('is-on', p >= (k / (items.length - 1)) * 0.98 && p > 0.01));
    };
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
