/* Visa page only (22 Nov, user request; styles in visa.css).
   - Document checklist ([data-udocs]): the chosen visa decides which documents count (each .udoc lists its visas in
     data-for, "all" for every visa); the others fade. Ticks fill the ring, update each group's count and rewrite the
     WhatsApp message, so "Send my checklist" sends what the visitor has and what they still need. Every visit starts
     empty on Tourist (24 Nov, user request: the next visitor must not find someone's ticks): nothing is saved, and the
     browser's own restoring of ticked boxes on a refresh or Back is undone. A document the chosen visa does not need
     can't be ticked (disabled) and says so in its own status chip; a tick it had comes back if that visa is chosen again.
     Each group is an accordion (tap its title); once every document in it is ticked it closes by itself, so the next
     group moves up, and if its title had gone under the top bar the page scrolls back just enough to show it. Choosing
     another visa opens the groups that still need something. Phones and tablets: the visa tabs and a one-line count
     stick under the top bar (visa.css), so the count there is short ("3 to arrange").
   - Why visas are refused ([data-urisk]): on desktop one reason is open at a time (tabs beside one panel); on phones
     each opens and closes on its own (an accordion), so nothing above jumps. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Document checklist ---------- */
  const docs = $('[data-udocs]');
  if (docs) {
    const KEY = 'marjan-visa-docs';
    const NAME = { tourist: 'tourist', family: 'family visit', business: 'business', schengen: 'Schengen' };
    const types = $$('input[name="udocs-type"]', docs);
    const items = $$('.udoc', docs);
    const box = (li) => $('input', li);
    const card = $('.udocs__card', docs);
    const groups = $$('.udocs__group', docs);
    const aside = $('.udocs__aside', docs);
    const header = $('.site-header');
    const narrow = matchMedia('(max-width: 959.98px)'); // the sticky bar (visa.css)
    const cap = (t) => t[0].toUpperCase() + t.slice(1);
    const current = () => (types.find((t) => t.checked) || types[0]).value;
    const send = $('[data-udocs-send]', docs);
    const wa = (document.documentElement.dataset.whatsapp || '').replace(/\D/g, '');
    const forType = (li, t) => li.dataset.for.split(' ').some((f) => f === 'all' || f === t);
    // how many documents each visa needs, beside its name (counted, so it stays right when the list changes)
    $$('[data-udocs-tc]', docs).forEach((el) => { el.textContent = items.filter((li) => forType(li, el.dataset.udocsTc)).length; });

    // ticks an earlier version saved in this browser (before 24 Nov) are cleared, so they can't come back
    try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
    const reset = () => {
      types.forEach((t) => { t.checked = t.defaultChecked; });
      items.forEach((li) => { box(li).checked = false; delete li.dataset.held; });
    };
    reset();
    // the boxes as the list last drew them: every tick and visa change goes through update(), so if they differ the
    // browser has put old ticks back by itself (see fresh() below)
    const state = () => [...types, ...items.map(box)].map((b) => (b.checked ? 1 : 0)).join('');
    let drawn = '';

    const update = () => {
      const type = current();
      const counts = (li) => forType(li, type);
      const have = [], need = [];
      items.forEach((li) => {
        const on = counts(li);
        const b = box(li);
        // not needed for this visa: untick it (remembered while the page is open) and disable it
        if (!on && b.checked) { li.dataset.held = ''; b.checked = false; }
        if (on && 'held' in li.dataset) { b.checked = true; delete li.dataset.held; }
        b.disabled = !on;
        li.classList.toggle('is-off', !on);
        const off = $('[data-udoc-off]', li);
        if (off) off.textContent = `Not required for a ${NAME[type]} visa`;
        if (on) (b.checked ? have : need).push(b.value);
      });
      const total = have.length + need.length;

      $$('.udocs__group', docs).forEach((g) => {
        const mine = $$('.udoc', g).filter(counts);
        const got = mine.filter((li) => box(li).checked).length;
        const tag = $('[data-udocs-gc]', g);
        tag.textContent = got ? `${got} of ${mine.length} ready` : `${mine.length} document${mine.length === 1 ? '' : 's'}`;
        tag.classList.toggle('is-done', got === mine.length);
        g.classList.toggle('is-done', got === mine.length);
      });

      card.style.setProperty('--p', total ? (have.length / total) * 100 : 0);
      card.classList.toggle('is-empty', !have.length);
      card.classList.toggle('is-done', total > 0 && !need.length);
      $('[data-udocs-have]', docs).textContent = have.length;
      $('[data-udocs-need]', docs).textContent = total;
      $('[data-udocs-title]', docs).textContent = !need.length
        ? `All ${total} ready`
        : `${total} documents for a ${NAME[type]} visa`;
      $('[data-udocs-note]', docs).textContent = !have.length
        ? 'Tick what you already have. We help you with the rest.'
        : !need.length
          ? 'Send it to us, and we check every page before you apply.'
          : `${need.length} still to arrange. We can help with ${need.length === 1 ? 'it' : 'them'}.`;
      // the bar on phones and tablets: one short line, and the visa under it
      $('[data-udocs-mini]', docs).textContent = !have.length ? 'Start ticking' : !need.length ? `All ${total} ready` : `${need.length} to arrange`;
      $('[data-udocs-mini-type]', docs).textContent = `${cap(NAME[type])} visa`;

      const lines = [`Assalam o Alaikum Marjan Travel & Tours! I'm applying for a ${NAME[type]} visa.`];
      if (have.length) lines.push(`I have: ${have.join(', ')}.`);
      if (need.length) lines.push(`I still need help with: ${need.join(', ')}.`);
      lines.push('Please send me my personal checklist.');
      send.href = `https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`;
      drawn = state();
    };

    /* the groups: an accordion that closes a group by itself once all its documents are ticked */
    const complete = (g) => { const mine = $$('.udoc', g).filter((li) => forType(li, current())); return mine.length > 0 && mine.every((li) => box(li).checked); };
    // While a group folds or opens, the browser's scroll anchoring is paused for the page: it would otherwise scroll to
    // hold whatever is below the list in place, so a tapped title jumped, and added to keepInView's scroll.
    const root = document.documentElement;
    let anchorTimer = 0;
    const shut = (g, on) => {
      root.style.overflowAnchor = 'none';
      clearTimeout(anchorTimer);
      anchorTimer = setTimeout(() => { root.style.overflowAnchor = ''; }, 700);
      g.classList.toggle('is-shut', on);
      $('[data-udocs-toggle]', g).setAttribute('aria-expanded', String(!on));
    };
    const timers = new Map();
    groups.forEach((g) => $('[data-udocs-toggle]', g).addEventListener('click', () => { clearTimeout(timers.get(g)); shut(g, !g.classList.contains('is-shut')); }));
    // a closed group's title should not be left under the top bar (and, on phones, the sticky visa bar): if it is,
    // scroll back just enough to show it. Scrolling up brings the top bar back, so aim below where it will be.
    const keepInView = (g) => {
      const top = g.getBoundingClientRect().top;
      // the bar as drawn (--header-h, as the CSS uses it; the header's box is taller, it has room for a shadow)
      const headH = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || (header ? header.offsetHeight : 0);
      const covered = narrow.matches ? aside.getBoundingClientRect().bottom : header && !header.classList.contains('is-hidden') ? headH : 0;
      if (top >= covered + 4) return;
      const below = narrow.matches ? headH + 8 + aside.offsetHeight + 12 : headH + 24;
      scrollBy({ top: top - below, behavior: 'smooth' }); // a short glide alongside the fold, never a jump
    };
    docs.addEventListener('change', (e) => {
      update();
      const t = e.target;
      // another visa: open what still needs something, and if the list's start is under the bar, bring it back
      if (t.name === 'udocs-type') { groups.forEach((g) => shut(g, complete(g))); keepInView(groups[0]); return; }
      const g = t.closest('.udocs__group');
      if (!g) return;
      clearTimeout(timers.get(g));
      // a short pause, so the tick is seen before the group folds away (and a quick untick cancels it)
      if (t.checked && complete(g)) timers.set(g, setTimeout(() => { if (complete(g) && !g.classList.contains('is-shut')) { shut(g, true); keepInView(g); } }, 450));
    });
    // the list as a new visitor sees it: every group open, no folding animation
    const fresh = () => {
      reset();
      update();
      docs.classList.add('is-still');
      groups.forEach((g) => { clearTimeout(timers.get(g)); shut(g, false); });
      requestAnimationFrame(() => requestAnimationFrame(() => docs.classList.remove('is-still')));
    };
    fresh();
    // Start over when the browser brings old ticks back. Back can restore the whole page as it was left (back/forward
    // cache, e.persisted). Without that cache Chrome puts the ticked boxes back just before pageshow, after this
    // script, and Firefox does it on a refresh (before this script, so reset() above undoes it); the list then said
    // "0 of 7" over ticked boxes (24 Nov site check).
    addEventListener('pageshow', (e) => { if (e.persisted || state() !== drawn) fresh(); });
  }

  /* ---------- Why visas are refused ---------- */
  const risk = $('[data-urisk]');
  if (risk) {
    const wide = matchMedia('(min-width: 960px)');
    const its = $$('.urisk__item', risk);
    const set = (it, on) => { it.classList.toggle('is-open', on); $('.urisk__tab', it).setAttribute('aria-expanded', String(on)); };
    its.forEach((it) => $('.urisk__tab', it).addEventListener('click', () => {
      if (wide.matches) its.forEach((x) => set(x, x === it));
      else set(it, !it.classList.contains('is-open'));
    }));
    // back on a wide screen: exactly one open (the first open one, or the first)
    const tidy = () => {
      if (!wide.matches) return;
      const keep = its.find((x) => x.classList.contains('is-open')) || its[0];
      its.forEach((x) => set(x, x === keep));
    };
    wide.addEventListener('change', tidy);
    tidy();
  }
})();
