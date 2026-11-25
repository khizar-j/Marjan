/* Ramadan and Hajj dates, worked out from the Umm al-Qura calendar (Saudi Arabia's official Islamic calendar) that
   browsers and Node have built in. The site moves on to the next Ramadan, Hajj and Umrah season by itself: nobody has
   to type a date in. The calendar gives the expected dates; the real start of Ramadan and the day of Hajj follow the
   moon sighting and can be a day apart, so the pages say "expected" / "around".
   - build.mjs runs this file for {{season key}} and {{season-text key}} in the pages (the title, meta, JSON-LD and the
     first paint), with the build day as "today".
   - main.js reads window.MarjanSeasons in the browser, with the visitor's day: it rewrites every [data-season] text
     (so the page is right however long ago it was built) and builds the "When" lists from it.
   Keys: ramadan-year "2027", ramadan-start "8 February 2027", ramadan-hijri "1448", hajj-year "2027",
   hajj-date "15 May 2027" (the Day of Arafah), season "2026–27" (the Umrah season: from one Hajj to the next) and
   season-hijri "1448". Ramadan counts until it is over, then the next one; Hajj until its last day (13 Dhul Hijjah).
   Umrah visas: Saudi Arabia stops them around Hajj. In 2025 pilgrims had to leave by 1 Dhul Qadah, and visas started
   again after mid Dhul Hijjah, so a month counts as "Hajj season" when at least half of it falls from 1 Dhul Qadah to
   14 Dhul Hijjah (PAUSE). Change PAUSE if Saudi Arabia changes those dates.
   Testing: set window.MarjanSeasonsToday (a Date) before this file runs to see the site on another day. */
(function (root) {
  'use strict';
  const DAY = 864e5;
  const PAUSE = [[11, 1], [12, 14]]; // [Hijri month, day]: from 1 Dhul Qadah to 14 Dhul Hijjah
  let cal = null;
  try {
    cal = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
    if (cal.resolvedOptions().calendar !== 'islamic-umalqura') cal = null;
  } catch (e) { cal = null; }
  if (!cal) { // a browser without the Islamic calendar: the pages keep the dates from the last build
    root.MarjanSeasons = { ok: false, values: {}, text: () => '', hajjMonth: () => false };
    return;
  }

  const hijri = (t) => {
    const o = {};
    cal.formatToParts(new Date(t)).forEach((p) => { if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10); });
    return o;
  };
  const t0 = root.MarjanSeasonsToday;
  const d0 = t0 && typeof t0.getFullYear === 'function' ? t0 : new Date();
  const today = Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate());
  const now = hijri(today);
  // The Gregorian day (UTC midnight) of day d of Hijri month m in Hijri year y: a guess from the average month length,
  // then a look either side of it for the exact day
  const at = (y, m, d) => {
    const guess = today + Math.round(((y - now.year) * 12 + (m - now.month)) * 29.530589 + (d - now.day)) * DAY;
    for (let k = 0; k <= 20; k++) {
      for (const t of k ? [guess - k * DAY, guess + k * DAY] : [guess]) {
        const h = hijri(t);
        if (h.year === y && h.month === m && h.day === d) return t;
      }
    }
    return guess;
  };
  const year = (t) => new Date(t).getUTCFullYear();
  const span = (a, b) => (a === b ? String(a) : `${a}–${String(b).slice(-2)}`); // 2026–27
  const long = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });

  let ry = now.year; // Ramadan (month 9): this Hijri year's until 1 Shawwal, then next year's
  if (today >= at(ry, 10, 1)) ry += 1;
  const rStart = at(ry, 9, 1);
  const rEnd = at(ry, 10, 1) - DAY;
  let hy = now.year; // Hajj (Dhul Hijjah, month 12): this Hijri year's until its last day, then next year's
  if (today > at(hy, 12, 13)) hy += 1;
  const arafah = at(hy, 12, 9);
  const pauses = [hy - 1, hy, hy + 1].map((y) => [at(y, PAUSE[0][0], PAUSE[0][1]), at(y, PAUSE[1][0], PAUSE[1][1])]);

  const values = {
    'ramadan-year': span(year(rStart), year(rEnd)),
    'ramadan-start': long.format(rStart),
    'ramadan-hijri': String(ry),
    'hajj-year': String(year(arafah)),
    'hajj-date': long.format(arafah),
    season: span(year(at(hy - 1, 12, 9)), year(arafah)),
    'season-hijri': String(hy),
  };
  root.MarjanSeasons = {
    ok: true,
    values,
    text: (k) => values[k] || '',
    // true when at least half of month m (0–11) of year y falls while Umrah visas are stopped for Hajj
    hajjMonth: (y, m) => {
      const a = Date.UTC(y, m, 1);
      const b = Date.UTC(y, m + 1, 1);
      const off = pauses.reduce((n, [s, e]) => n + Math.max(0, (Math.min(b, e + DAY) - Math.max(a, s)) / DAY), 0);
      return off * 2 >= (b - a) / DAY;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
