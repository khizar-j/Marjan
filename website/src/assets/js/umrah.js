/* Umrah packages page (/services/umrah-packages/). Runs after site.js, main.js and service.js (the hero video, the sheet
   and the quote form starting on "Umrah package"). This file adds the Umrah planner: the length slider, hotel level and
   pilgrims, and the plan they build night by night. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Umrah planner (Choose how many days) ----------
     Three steps build the plan on the navy card: the length (a range input: drag, click a stop, or arrow keys), the
     hotel level (radio buttons) and the number of pilgrims (− / +). Dragging moves the handle smoothly (step "any")
     and the plan follows the nearest length; letting go glides the handle onto it. Each length has its own panel
     (#7-days … #28-days); its night bars rise one after another when it is picked (.is-anim), and the first time the
     card comes into view. The two buttons always carry the whole plan: the quote button fills the form's notes and
     travellers, the WhatsApp button's message is rewritten on every change. */
  const plan = $('[data-udur]');
  if (plan) {
    const range = $('[data-udur-range]', plan);
    const wrap = range.closest('.udur__range');
    const bubble = $('[data-udur-bubble]', plan);
    const stops = $$('[data-udur-stop]', plan);
    const panels = $$('.udur__panel', plan);
    const quote = $('[data-udur-quote]', plan);
    const wa = $('[data-udur-wa]', plan);
    const paxOut = $('[data-udur-pax-out]', plan);
    const paxUnit = $('[data-udur-pax-unit]', plan);
    const paxBtns = $$('[data-udur-pax]', plan);
    const hotelChip = $('[data-udur-hotel-chip]', plan);
    const paxChip = $('[data-udur-pax-chip]', plan);
    const waNumber = (document.documentElement.dataset.whatsapp || '').replace(/\D/g, '');
    const max = panels.length - 1;
    let i = Math.max(0, panels.findIndex((p) => p.classList.contains('is-on')));
    let pax = Number(paxOut.value || paxOut.textContent) || 2;
    let seen = false;
    let tween = 0;

    // Phones: a length's description takes one line or two depending on the screen. All of them get the room of the
    // longest one as it is on this screen (--best, used by umrah.css), so the night bars stay at the same height
    // whichever length is picked, and no empty line is left when every description fits on one line
    const bests = $$('.udur__best', plan);
    let bestW = 0;
    const fitBest = () => {
      if (plan.offsetWidth === bestW) return;
      bestW = plan.offsetWidth;
      plan.style.removeProperty('--best');
      plan.style.setProperty('--best', `${Math.max(...bests.map((b) => b.offsetHeight))}px`);
    };
    fitBest();
    if ('ResizeObserver' in window) new ResizeObserver(fitBest).observe(plan);
    if (document.fonts) document.fonts.ready.then(() => { bestW = 0; fitBest(); }); // the web font sets the line breaks

    const hotel = () => { const r = $('input[name="udur-hotel"]:checked', plan); return r ? r.dataset.name : ''; };
    const setP = (v) => wrap.style.setProperty('--p', (v / max).toFixed(4));
    const bump = (el, cls = 'is-bump') => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
    const animate = (p) => { if (seen) bump(p, 'is-anim'); };

    const sync = () => {
      const p = panels[i];
      const d = +p.dataset.d, mk = +p.dataset.mk, md = +p.dataset.md;
      const h = hotel();
      const who = `${pax} pilgrim${pax > 1 ? 's' : ''}`;
      bubble.textContent = `${d} days`;
      range.setAttribute('aria-valuetext', `${d} days: ${mk} nights in Makkah, ${md} in Madinah`);
      stops.forEach((s, k) => s.classList.toggle('is-on', k === i));
      $$('[data-udur-hotel]', plan).forEach((el) => { el.textContent = h; });
      if (hotelChip) hotelChip.textContent = `${h} hotels`;
      if (paxChip) paxChip.textContent = who;
      paxOut.value = String(pax);
      if (paxUnit) paxUnit.textContent = pax > 1 ? 'pilgrims' : 'pilgrim';
      paxBtns.forEach((b) => { b.disabled = (+b.dataset.udurPax < 0 && pax <= 1) || (+b.dataset.udurPax > 0 && pax >= 50); });
      quote.dataset.quoteTravellers = String(pax); // the quote form's Travellers follows the pilgrims picked here
      quote.dataset.quoteNote = `${d} days Umrah package, ${h} hotels (${mk} nights Makkah, ${md} nights Madinah), ${who}`;
      wa.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(
        `Assalam o Alaikum Marjan Travel & Tours! I'd like a quote for a ${d} days Umrah package with ${h} hotels (${mk} nights Makkah, ${md} nights Madinah) for ${who}.`)}`;
    };

    // show length k (0–5): swap the panel, replay its bars
    const pick = (k) => {
      k = Math.max(0, Math.min(max, k));
      if (k === i) return;
      panels[i].classList.remove('is-on', 'is-anim');
      i = k;
      panels[i].classList.add('is-on');
      animate(panels[i]);
      sync();
    };

    // glide the handle to stop k, then put the input back on whole steps (for the keyboard)
    const slideTo = (k) => {
      cancelAnimationFrame(tween);
      pick(k);
      const from = +range.value;
      if (Math.abs(from - k) < 0.001) { range.step = '1'; range.value = String(k); setP(k); return; }
      range.step = 'any';
      const t0 = performance.now();
      const dur = 260;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const v = from + (k - from) * (1 - Math.pow(1 - t, 3));
        range.value = String(v);
        setP(v);
        if (t < 1) tween = requestAnimationFrame(step);
        else { range.step = '1'; range.value = String(k); setP(k); }
      };
      tween = requestAnimationFrame(step);
    };

    let dragging = false;
    range.addEventListener('pointerdown', () => { cancelAnimationFrame(tween); dragging = true; range.step = 'any'; });
    range.addEventListener('input', () => {
      const v = +range.value;
      setP(v);
      pick(Math.round(v));
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      slideTo(Math.round(+range.value));
    };
    range.addEventListener('change', release);
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
    stops.forEach((s) => s.addEventListener('click', () => slideTo(+s.dataset.udurStop)));

    $$('input[name="udur-hotel"]', plan).forEach((r) => r.addEventListener('change', () => { sync(); bump(hotelChip); }));
    paxBtns.forEach((b) => b.addEventListener('click', () => {
      pax = Math.max(1, Math.min(50, pax + Number(b.dataset.udurPax)));
      sync();
      bump(paxOut);
      bump(paxChip);
    }));

    // the quote button also sets the form's number of travellers
    quote.addEventListener('click', () => {
      const f = $('[data-quote-form]');
      if (f && f.elements.travellers) f.elements.travellers.value = String(pax);
    });

    // the bars rise the first time the card comes into view
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        seen = true;
        setTimeout(() => animate(panels[i]), 200); // once the card's own reveal is under way
      }, { threshold: 0.3 });
      io.observe(plan);
    } else { seen = true; animate(panels[i]); }

    // a link to one length (#7-days … #28-days, as in the Service schema) opens it; the browser scrolls to the panel
    const fromHash = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const k = id ? panels.findIndex((p) => p.id === id) : -1;
      if (k >= 0) slideTo(k);
    };
    setP(i);
    sync();
    fromHash();
    addEventListener('hashchange', fromHash);
    // Coming back with Back (Chrome, when it doesn't keep the page whole) or refreshing in Firefox, the browser puts the
    // length and hotel back as they were left, without an input or change event, so the plan showed 15 days and 4-Star
    // over a slider on 21 and 5-Star ticked (24 Nov site check). Chrome does it just before pageshow: show what they hold.
    addEventListener('pageshow', () => {
      if (dragging) return;
      const k = Math.max(0, Math.min(max, Math.round(+range.value)));
      cancelAnimationFrame(tween);
      range.step = '1';
      range.value = String(k);
      setP(k);
      pick(k);
      sync();
    });
  }
})();
