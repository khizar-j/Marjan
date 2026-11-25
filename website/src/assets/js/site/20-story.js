/* Introduction, Services and Why choose us (styles: css/site/20-story.css). All copy is in the HTML;
   this only adds scroll-led motion, with scroll positions from MFX (00-core.js). */
(() => {
  const d = document;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const M = window.MFX;
  if (!M) { $$('[data-arrive]').forEach((el) => el.classList.add('in')); return; }

  /* ---------- Intro: words light up along the reading line ---------- */
  const intro = $('[data-story-intro]');
  const text = intro && $('[data-words]', intro);
  if (text) {
    const words = [];
    const links = []; // [link, index of its last word]: its underline draws once that word is lit
    const split = (node) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          for (const part of n.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (!part.trim()) { frag.append(part); continue; }
            const w = d.createElement('span');
            w.className = 'sw';
            w.textContent = part;
            frag.append(w);
            words.push(w);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          // placeholders swap their text (sample-data switch), so they stay whole and light as one word
          if (n.classList.contains('ph')) { n.classList.add('sw'); words.push(n); continue; }
          split(n);
          if (n.tagName === 'A') links.push([n, words.length - 1]);
        }
      }
    };
    split(text);
    text.classList.add('is-split');
    let lit = 0;
    const phone = matchMedia('(max-width: 639.98px)');
    M.progress(text, (_, r) => {
      const vh = M.vh(); // steady while a phone's toolbars slide away (innerHeight jumped and lit a line of words)
      // the first word lights when the text's top is 90% down the screen, the last when its bottom is 70% down.
      // Phones (asked for: much faster): the words light over a quarter of a screen of scrolling, from the text's
      // top 75% down the screen to 50% down, whatever the text's height (it was about two thirds of a screen)
      const p = phone.matches
        ? M.clamp((vh * 0.75 - r.top) / (vh * 0.25))
        : M.clamp((vh * 0.9 - r.top) / (r.height + vh * 0.2));
      const n = Math.round(p * words.length);
      if (n === lit) return;
      const on = n > lit;
      for (let i = Math.min(n, lit); i < Math.max(n, lit); i++) words[i].classList.toggle('on', on);
      lit = n;
      for (const [a, last] of links) a.classList.toggle('on', lit > last);
    });
  }
  const seal = intro && $('.seal', intro);
  if (seal) M.bind(seal, {}, '--turn');

  /* ---------- Services ---------- */
  const svs = $('[data-svs]');
  if (svs) {
    const track = svs.parentElement;
    const items = $$('.svx__item', svs);
    const heads = items.map((it) => $('.svx__head', it));
    const wide = matchMedia('(min-width: 1024px)');
    const pinned = matchMedia('(min-width: 1024px) and (min-height: 650px)'); // same query as the CSS
    let idx = Math.max(0, items.findIndex((it) => it.classList.contains('is-active')));
    let pin = false; // the pinned scene is on (and fits the screen)
    let step = -1;
    let top = 0;
    let room = 1;
    let f = 0;     // scroll position through the scene, 0..items.length
    let base = null; // after a click: [scroll position, service] the scroll carries on from

    // desktop: one service open at a time. Its photo pushes the last one out: photos before it wait above the frame,
    // the rest below; the photo going out keeps its transition for a moment (.is-leaving), the others just jump
    const leave = new Map();
    const open = (i) => {
      const was = idx;
      idx = i;
      items.forEach((it, k) => {
        // a photo still on its way out that now has to cross to the other side jumps there instead
        if (k !== was && k !== i && it.classList.contains('is-above') !== k < i) {
          clearTimeout(leave.get(it));
          it.classList.remove('is-leaving');
        }
        it.classList.toggle('is-active', k === i);
        it.classList.toggle('is-above', k < i);
        heads[k].setAttribute('aria-expanded', String(k === i));
      });
      if (was === i) return;
      const out = items[was];
      clearTimeout(leave.get(out));
      out.classList.add('is-leaving');
      leave.set(out, setTimeout(() => out.classList.remove('is-leaving'), 1000));
    };
    // phones and tablets: every service open; a tap folds one away or back
    const fold = (k, shut) => {
      items[k].classList.toggle('is-shut', shut);
      heads[k].setAttribute('aria-expanded', String(!shut));
    };
    const sync = () => {
      if (wide.matches) { items.forEach((it) => it.classList.remove('is-shut')); open(idx); }
      else items.forEach((it, k) => fold(k, it.classList.contains('is-shut')));
    };
    // pin only when the whole scene (with its longest service open) fits under the header; otherwise a plain list
    const measure = () => {
      step = -1;
      base = null;
      track.classList.remove('is-loose');
      pin = pinned.matches;
      if (!pin) return;
      top = parseFloat(getComputedStyle(svs).top) || 0;
      const list = heads.reduce((h, x) => h + x.offsetHeight + 2, 0)
        + Math.max(...items.map((it) => $('.svx__panel > div', it).scrollHeight));
      pin = top + Math.max(list, svs.offsetHeight) <= M.vh() + 1; // steady: not innerHeight (see js/site/00-core.js)
      track.classList.toggle('is-loose', !pin);
      if (pin) room = Math.max(1, parseFloat(getComputedStyle(track, '::after').height) || 1);
    };
    // position in the list; after a click the scroll carries on from that service (never jumping back)
    const at = () => {
      if (!base) return f;
      const [f0, k] = base;
      const n = items.length;
      const a = k + 0.5;
      return f <= f0 ? (f0 > 0 ? (f / f0) * a : a) : a + ((f - f0) / (n - f0)) * (n - a);
    };

    heads.forEach((h, k) => h.addEventListener('click', () => {
      if (!wide.matches) return fold(k, !items[k].classList.contains('is-shut'));
      open(k);
      if (pin) { base = [f, k]; step = k; }
    }));
    // tabbing to a hidden link opens its service; the scroll leaves keyboard users alone
    let kb = false;
    svs.addEventListener('focusin', (e) => {
      kb = e.target.matches(':focus-visible');
      const k = items.findIndex((it) => it.contains(e.target));
      if (k < 0 || heads[k].contains(e.target)) return;
      if (wide.matches) { if (k !== idx) open(k); } else if (items[k].classList.contains('is-shut')) fold(k, false);
    });
    svs.addEventListener('focusout', (e) => { if (!svs.contains(e.relatedTarget)) kb = false; });

    // pinned scene: the scroll picks the service
    M.progress(track, (_, r) => {
      if (!pin) return;
      f = M.clamp((top - r.top) / room) * items.length;
      if (base && f !== base[0] && (f <= 0 || f >= items.length)) base = null; // scrolled out of the scene: plain mapping again
      const g = at();
      items.forEach((it, k) => it.style.setProperty('--fill', M.clamp(g - k).toFixed(3)));
      const s = Math.min(items.length - 1, Math.floor(g));
      if (s !== step) { step = s; if (!kb) open(s); }
    });
    // phones and tablets: each photo rises in as its service scrolls in; the one on the reading line is marked
    items.forEach((it) => M.progress(it, (_, r) => {
      if (wide.matches) return;
      const vh = M.vh(); // not innerHeight: it changes as a phone's toolbars slide away, and the photo jumped
      it.style.setProperty('--in', M.clamp((vh - r.top) / (vh * 0.6)).toFixed(3));
      const on = r.top < vh * 0.5 && r.bottom > vh * 0.5;
      if (on !== it.classList.contains('is-active')) it.classList.toggle('is-active', on);
    }));

    wide.addEventListener('change', sync);
    pinned.addEventListener('change', measure);
    M.onScreen(measure); // not every 'resize': a phone's toolbars sliding would flip the scene to a list and back
    sync();
    measure();
  }

  /* ---------- Why choose us: the arch opens, the reasons arrive around it ---------- */
  const arch = $('[data-arch]');
  if (arch) {
    const media = $('.arch__media', arch);
    if (media) M.progress(media, (p) => {
      media.style.setProperty('--open', p.toFixed(3));
      media.classList.toggle('is-open', p > 0.75);
    }, { mode: 'enter', span: 0.7 });

    // left and right in turn, row by row; reasons that come into view together are staggered
    const [l, r] = $$('.arch__col', arch).map((c) => $$('[data-arrive]', c));
    const order = l.flatMap((x, k) => [x, r[k]]).concat(r.slice(l.length)).filter(Boolean);
    // phones and tablets: from just before they reach the screen, with a shorter stagger (a fast flick found blanks)
    const touchSize = matchMedia('(max-width: 1023.98px)').matches;
    const io = new IntersectionObserver((entries) => {
      let n = 0;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.style.setProperty('--wait', `${n++ * (touchSize ? 60 : 140)}ms`);
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }, touchSize ? { rootMargin: '0px 0px 10% 0px', threshold: 0 } : { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    order.forEach((el) => io.observe(el));
  }
})();
