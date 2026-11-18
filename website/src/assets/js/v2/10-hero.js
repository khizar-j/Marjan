/* Version 2 · hero background videos. One muted 8 s clip per journey (the client's own edits), on top of its poster.
   main.js runs the journey picker and fires a 'journey' event on every switch; this file only handles the video:
   - the clip sets the pace (hero.journeyClock, read by main.js every frame): each journey plays its clip once and
     the next journey starts as it ends, with a straight cut, so the five clips run on like one film
   - while main.js holds the slideshow (form in use, mouse over the form, pause, hero partly scrolled away) the
     current clip loops instead of stopping on its last frame
   - after the page has loaded, the active journey's video starts; once it is fully buffered the next journey's video
     (and poster) is fetched in the background, the rest only when they are picked
   - a click, key or swipe restarts the new video at 0 and fades it in over the old one; if it is not ready yet, its
     poster (the clip's first frame) shows first and the video takes over once it plays
   - paused while the hero is off-screen, the browser tab is hidden or the visitor presses pause
   - Save-Data and 2g connections get the posters only, on main.js's 8 s timer (data-duration)
   Files: every screen gets the client's own file as uploaded (-1080, the video track copied untouched), except
   phones in portrait, which get -m: an upright 608×1080 cut of the same footage at full quality. */
(() => {
  const hero = document.querySelector('[data-hero]');
  const slides = hero ? [...hero.querySelectorAll('.hero__slide[data-video]')] : [];
  if (!slides.length) return;
  const planner = hero.querySelector('[data-planner]');
  const pauseBtn = hero.querySelector('[data-autoplay-toggle]');
  const net = navigator.connection || {};
  const lite = !!net.saveData || /2g/.test(net.effectiveType || '');
  const phone = matchMedia('(max-width: 639.98px) and (orientation: portrait)');
  const FADE = 1000; // a little longer than the CSS crossfade (.9 s)

  let cur = slides.find((s) => s.classList.contains('is-active')) || slides[0];
  let started = false, inView = true, paused = false, settleT = 0, since = 0;
  let covered = false; // the page below has risen right over the hero (see "Scrolling away")
  const manual = () => !!planner && planner.classList.contains('is-manual'); // the visitor has started the form

  const variant = () => (phone.matches ? 'm' : '1080');
  let size = variant();
  const vid = (s) => s.querySelector('video');
  const halted = () => paused || covered || !inView || document.hidden;

  // Poster: the first slide's is in the HTML; the others carry data-src / data-srcset until needed
  const poster = (s) => {
    const img = s.querySelector('img');
    if (img.dataset.src) {
      s.querySelectorAll('source[data-srcset]').forEach((so) => { so.srcset = so.dataset.srcset; so.removeAttribute('data-srcset'); });
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
    return img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => {});
  };
  const hasPicture = (s) => {
    const img = s.querySelector('img'), v = vid(s);
    return (img.complete && img.naturalWidth > 0 && !img.dataset.src) || (v && v.classList.contains('is-on'));
  };

  const video = (s) => {
    let v = vid(s);
    if (v || lite) return v;
    v = document.createElement('video');
    v.muted = v.defaultMuted = v.loop = v.playsInline = true;
    for (const a of ['muted', 'playsinline', 'loop', 'disablepictureinpicture', 'disableremoteplayback']) v.setAttribute(a, '');
    v.setAttribute('aria-hidden', 'true');
    v.tabIndex = -1;
    v.preload = 'auto';
    v.src = `${s.dataset.video}-${size}.mp4`;
    v.addEventListener('playing', () => v.classList.add('is-on'));
    // main.js moves on within a frame of the end; if it has not (its clock stalled), loop rather than freeze
    v.addEventListener('ended', () => setTimeout(() => {
      if (v.ended && s === cur && !halted()) { const p = v.play(); if (p) p.catch(() => {}); }
    }, 400));
    s.appendChild(v);
    return v;
  };

  const play = (s) => {
    const v = video(s);
    if (!v) return;
    if (halted()) v.pause();
    else { const p = v.play(); if (p) p.catch(() => {}); }
  };
  const stop = (s) => {
    const v = vid(s);
    if (!v) return;
    v.pause();
    if (v.currentTime) v.currentTime = 0;
  };

  // While the slideshow runs by itself, fetch the next journey: its poster (small) at once, its video once the
  // visible one is fully buffered (or after 3 s), so the cut at the end of this clip has the next one ready
  const prefetchNext = (s) => {
    const v = vid(s);
    const next = slides[(slides.indexOf(s) + 1) % slides.length];
    let t = 0;
    const running = () => s === cur && !paused && !manual();
    if (running()) poster(next);
    const check = () => {
      const b = v.buffered;
      if (b.length && v.duration && b.end(b.length - 1) >= v.duration - 0.3) go();
    };
    const go = () => {
      clearTimeout(t);
      if (v) { v.removeEventListener('progress', check); v.removeEventListener('suspend', check); }
      if (running()) video(next);
    };
    if (!v) return;
    v.addEventListener('progress', check);
    v.addEventListener('suspend', check);
    t = setTimeout(go, 3000);
    check();
  };

  const settle = (prev) => {
    if (prev === cur) return;
    prev.classList.remove('is-prev');
    stop(prev);
  };

  // main.js asks this every frame: how far the current journey is (0–1), or null for its own timer.
  // run = main.js is counting; when it is holding, the clip loops (loop is only off while the slideshow runs).
  hero.journeyClock = (run) => {
    const v = vid(cur);
    if (!v || v.error) return null; // posters only, or the file failed: main.js's timer
    v.loop = !run;
    if (v.ended) {
      if (run) return 1;
      if (!halted()) { const p = v.play(); if (p) p.catch(() => {}); } // held just as it ended: loop it again
      return 0;
    }
    if (v.readyState < 2 || !v.duration) return performance.now() - since > 4000 ? null : 0; // loading: wait up to 4 s
    return Math.min(v.currentTime / v.duration, 1);
  };

  hero.addEventListener('journey', (e) => {
    const next = slides.find((s) => s.dataset.slide === e.detail.key);
    if (!next || next === cur) return;
    // the picture to fade from: the current slide, or (when clicking fast) the one still showing under it
    const prev = hasPicture(cur) ? cur : slides.find((s) => s.classList.contains('is-prev') && s !== next) || cur;
    // the slideshow moved on because the clip ended: cut straight to the next clip, like the cuts inside each clip
    const pv = vid(prev);
    const cut = !!e.detail.auto && !!pv && pv.classList.contains('is-on');
    slides.forEach((s) => s.classList.toggle('is-cut', cut && s === next));
    cur = next;
    since = performance.now();
    clearTimeout(settleT);
    slides.forEach((s) => { if (s !== prev && s !== next) { s.classList.remove('is-prev', 'is-wait'); stop(s); } });
    prev.classList.remove('is-wait');
    next.classList.remove('is-prev');
    prev.classList.add('is-prev'); // keeps the old picture fully visible underneath while the new one fades in
    const v = started ? video(next) : null;
    if (v && v.currentTime) v.currentTime = 0;
    const show = () => {
      if (cur !== next) return;
      next.classList.remove('is-wait');
      settleT = setTimeout(() => settle(prev), FADE);
    };
    if (hasPicture(next)) show();
    else {
      next.classList.add('is-wait');
      const ready = [poster(next), new Promise((r) => setTimeout(r, 2500))];
      if (v) ready.push(new Promise((r) => v.addEventListener('playing', r, { once: true })));
      Promise.race(ready).then(show);
    }
    if (started) { play(next); prefetchNext(next); }
  });

  const sync = () => {
    const v = vid(cur);
    if (!v) return;
    if (halted()) v.pause();
    else { const p = v.play(); if (p) p.catch(() => {}); }
  };
  new IntersectionObserver(([en]) => { inView = en.isIntersecting; sync(); }).observe(hero);

  // Scrolling away: everything after the hero is one sheet ([data-sheet]) that rises over it, while the hero stays
  // put (sticky) and sinks back. --cover goes 0 → 1 as the sheet covers the part of the hero on screen; once the
  // sheet is halfway up, the introduction on it comes in with the scroll (--rise 0 → 1). Fully covered, the video
  // pauses (a sticky hero never leaves the screen, so the observer above would keep it playing).
  const sheet = document.querySelector('[data-sheet]');
  if (sheet && window.MFX) {
    const intro = sheet.querySelector('[data-story-intro]');
    let seen = 1; // how much of the hero fits on screen (px)
    const measure = () => {
      const h = hero.offsetHeight;
      hero.style.top = `${Math.min(0, innerHeight - h)}px`; // a hero taller than the screen sticks once its bottom is in view
      seen = Math.max(1, Math.min(h, innerHeight));
    };
    measure();
    addEventListener('resize', measure);
    let cover = -1;
    let gone = false;
    const phone = matchMedia('(max-width: 639.98px)');
    // Every value below is written straight onto the one element it moves (inline styles), not as a CSS variable on
    // the hero or the introduction: a variable is inherited, so changing it made the phone restyle everything inside
    // them on every frame. The hero is its own layer (will-change in CSS) and the darkening is a separate layer
    // (.hero__dim), so sinking, shrinking and darkening never repaint the video or the planner. That repainting kept
    // phones too busy to draw the page rising over the hero on a fast flick, and the video showed in the gaps.
    const dim = document.createElement('i');
    dim.className = 'hero__dim';
    dim.setAttribute('aria-hidden', 'true');
    hero.appendChild(dim);
    const aside = intro && intro.querySelector('.intro__aside');
    const body = intro && intro.querySelector('.intro__body');
    // the sheet's top edge is the top of its first section (the trust strip), which MFX only measures near the screen
    MFX.progress(sheet.firstElementChild || sheet, (_, r) => {
      // Once the sheet's top (with its rounded corners) is 40px above the screen, nothing of the hero can show, so it
      // is made see-through (body.is-hero-gone, css/v2/10-hero.css). Being sticky, the hero otherwise sits under the
      // whole page, and on a fast flick a phone can't draw the page as quickly as it moves: the gaps showed the hero
      // video. Now they show the page colour, and the phone has one big layer less to keep under the page.
      const away = r.top < -40;
      if (away !== gone) { gone = away; document.body.classList.toggle('is-hero-gone', away); }
      const c = MFX.clamp((seen - r.top) / seen);
      if (c === cover) return;
      cover = c;
      // sinks a little lower (8% of its height) and smaller (7%), rounds its corners once, darkens up to 60%
      hero.style.translate = `0 ${(c * 8).toFixed(3)}%`;
      hero.style.scale = (1 - c * 0.07).toFixed(4);
      hero.classList.toggle('is-lifting', c > 0.001);
      dim.style.opacity = (c * 0.6).toFixed(3);
      // the introduction comes in from half covered; phones: done by 70% covered instead of 100%
      const rise = MFX.range(c, 0.5, phone.matches ? 0.7 : 1);
      if (aside) {
        aside.style.opacity = Math.min(1, rise * 1.6).toFixed(3);
        aside.style.translate = `0 ${((1 - rise) * 36).toFixed(1)}px`;
        aside.style.scale = (0.88 + rise * 0.12).toFixed(4);
      }
      if (body) {
        body.style.opacity = rise.toFixed(3);
        body.style.translate = `0 ${((1 - rise) * 56).toFixed(1)}px`;
      }
      const full = c > 0.99; // sub-pixel heights can stop it a hair short of 1
      if (full !== covered) { covered = full; sync(); }
    });
    // keyboard focus going back into a covered hero scrolls it back into view (a click on the part still showing doesn't)
    hero.addEventListener('focusin', (e) => {
      if (cover > 0.02 && e.target.matches(':focus-visible')) {
        scrollTo({ top: Math.max(0, hero.offsetTop + hero.offsetHeight - seen), behavior: MFX.reduced() ? 'auto' : 'smooth' });
      }
    });
  }
  document.addEventListener('visibilitychange', sync);

  // The pause button (main.js pauses the slideshow) pauses the video too; once the form is used it only pauses video
  const label = () => {
    const what = planner && planner.classList.contains('is-manual') ? 'video' : 'slideshow and video';
    pauseBtn.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} ${what}`);
  };
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      paused = pauseBtn.classList.contains('is-paused'); // main.js has already toggled it (its listener runs first)
      label();
      if (!paused && !vid(cur)) play(cur);
      sync();
    });
    // phones pin it over the scrolling tabs: a tap that focused it would scroll the row (keyboard focus still works)
    pauseBtn.addEventListener('mousedown', (e) => e.preventDefault());
  }
  // Once the form is in use the slideshow stops for good (main.js stops asking journeyClock), so the clip loops
  if (planner) new MutationObserver(() => {
    if (pauseBtn) label();
    if (manual()) slides.forEach((s) => { const v = vid(s); if (v) v.loop = true; });
  }).observe(planner, { attributes: true, attributeFilter: ['class'] });

  // Turning a phone (portrait ↔ landscape) swaps to the right file
  let rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const n = variant();
      if (n === size) return;
      size = n;
      slides.forEach((s) => {
        const v = vid(s);
        if (!v) return;
        if (s !== cur) { v.remove(); return; }
        const t = v.currentTime;
        v.classList.remove('is-on');
        v.src = `${s.dataset.video}-${size}.mp4`;
        v.currentTime = t;
        sync();
      });
    }, 400);
  });

  // Start after the page has loaded, so the video never competes with the poster, fonts and styles
  const start = () => {
    started = true;
    since = performance.now();
    if (lite) return;
    play(cur);
    prefetchNext(cur);
  };
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
})();
