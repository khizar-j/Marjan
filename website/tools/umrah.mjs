// Writes partials/umrah/durations.html and partials/umrah/types.html for the Umrah packages page (Nov 2026).
// Edit the data below, then run from website/src:  node ../tools/umrah.mjs partials/umrah  (and rebuild).
// No prices anywhere (client request).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const DIR = process.argv[2];
const esc = (s) => s.replace(/&(?!amp;)/g, '&amp;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const WA = "Assalam o Alaikum Marjan Travel & Tours! ";

/* ---------- Durations: the Umrah planner ----------
   Left: three steps (a slider for the length, the hotel level, the number of pilgrims). Right: the plan they make,
   night by night. Every length keeps its own panel in the HTML (#7-days … #28-days, the anchors the Service schema
   points to, and the "7 days umrah package" search phrases), stacked in one place; umrah.js "Umrah planner" shows the
   chosen one. No prices (client request). */
const DUR = [
  { d: 7, mk: 4, md: 3, best: 'Short leave? Umrah and prayers in both cities.' },
  { d: 10, mk: 6, md: 4, best: 'A little more time in Makkah and Madinah.' },
  { d: 14, mk: 8, md: 6, best: 'Two unhurried weeks, with time for Ziyarat.' },
  { d: 15, mk: 10, md: 5, best: 'A popular choice, with more nights in Makkah.' },
  { d: 21, mk: 14, md: 7, best: 'Three weeks for families and first-timers.' },
  { d: 28, mk: 20, md: 8, best: 'An extended stay, often chosen by retirees.' },
];
const DEF = 15;
// the planner's hotel levels; the short line under each fits one line on the narrowest phones (user request, 22 Nov)
const HOTELS = [
  { k: 'economy', name: 'Economy', sub: 'Shuttle bus' },
  { k: '4-star', name: '4-Star', sub: 'Short walk' },
  { k: '5-star', name: '5-Star', sub: 'Next to Haram' },
];
const HDEF = '4-star';
const PAX = 2;
const iDef = DUR.findIndex((x) => x.d === DEF);
const hDef = HOTELS.find((h) => h.k === HDEF);
const nightsLabel = (n) => `${n} night${n > 1 ? 's' : ''}`;
const quoteNote = (x, h, pax) => `${x.d} days Umrah package, ${h.name} hotels (${x.mk} nights Makkah, ${x.md} nights Madinah), ${pax} pilgrims`;
const waMsg = (x, h, pax) => WA + `I'd like a quote for a ${x.d} days Umrah package with ${h.name} hotels (${x.mk} nights Makkah, ${x.md} nights Madinah) for ${pax} pilgrims.`;

const nights = (x) => {
  const cells = [];
  for (let k = 0; k < x.mk + x.md; k++) {
    const mk = k < x.mk;
    cells.push(`<span class="${mk ? 'is-mk' : 'is-md'}" style="--k:${k}" data-tip="Night ${k + 1} · ${mk ? 'Makkah' : 'Madinah'}"></span>`);
  }
  return cells.join('');
};
const panel = (x) => `          <div class="udur__panel${x.d === DEF ? ' is-on' : ''}" id="${x.d}-days" data-d="${x.d}" data-mk="${x.mk}" data-md="${x.md}">
            <h3 class="udur__title"><strong>${x.d} days</strong> <span>Umrah package</span></h3>
            <p class="udur__best">${esc(x.best)}</p>
            <div class="unights">
              <p class="unights__legend"><span class="unights__mk">{{icon kaaba}}<span><strong>${nightsLabel(x.mk)}</strong> in Makkah</span></span><span class="unights__md">{{icon dome}}<span><strong>${nightsLabel(x.md)}</strong> in Madinah</span></span></p>
              <div class="unights__row" aria-hidden="true">${nights(x)}</div>
              <p class="unights__ends" aria-hidden="true"><span>{{icon plane}}Fly out</span><span>Fly home{{icon plane}}</span></p>
            </div>
            <ul class="udur__inc">
              <li>{{icon passport}}<span>Umrah visa</span></li>
              <li>{{icon plane}}<span>Return flights</span></li>
              <li>{{icon kaaba}}<span>Makkah hotel<small>${nightsLabel(x.mk)}<b> · <i data-udur-hotel>${hDef.name}</i></b></small></span></li>
              <li>{{icon hotel}}<span>Madinah hotel<small>${nightsLabel(x.md)}<b> · <i data-udur-hotel>${hDef.name}</i></b></small></span></li>
              <li>{{icon bus}}<span>Transport</span></li>
              <li>{{icon compass}}<span>Ziyarat</span></li>
            </ul>
          </div>`;
const stop = (x, k) => `<button class="udur__stop${x.d === DEF ? ' is-on' : ''}" type="button" tabindex="-1" style="--k:${k}" data-udur-stop="${k}">${x.d}<small>days</small></button>`;
const hotel = (h) => `<label class="useg__opt"><input type="radio" name="udur-hotel" value="${h.k}" data-name="${h.name}"${h.k === HDEF ? ' checked' : ''}><strong>${h.name}</strong><small>${h.sub}</small></label>`;
const x0 = DUR[iDef];

const durations = `<!-- ============ UMRAH · CHOOSE HOW MANY DAYS: the Umrah planner (umrah.js "Umrah planner", umrah.css "Choose how many
     days"). Three steps on the left (a slider for the length, the hotel level, the number of pilgrims) build the plan on
     the right night by night; its buttons carry the whole plan to the quote form or WhatsApp. The note under the steps says the plan can change. One panel per length
     (#7-days … #28-days, the anchors the Service schema points to). Patterns from Mobbin: Stripe's and Kit's snapping
     slider, the Cofounder / ElevenLabs calculator layout, Joby's journey line.
     Written by tools/umrah.mjs: edit the data there, not here. No prices (client request). ============ -->
<section class="udur section section--tint" id="umrah-durations" aria-labelledby="udur-title">
  <div class="container">
    <div class="section-head section-head--split">
      <h2 id="udur-title" data-reveal>Choose How Many Days</h2>
      <p class="section-head__lead" data-reveal style="--d:1">Slide to pick a length, choose your hotels and tell us how many are travelling. Your plan builds itself as you go, night by night.</p>
    </div>
    <div class="udur__card" data-reveal data-udur>
      <div class="udur__controls">
        <div class="udur__step">
          <p class="udur__q" id="udur-q1"><span class="udur__n">1</span>How many days?</p>
          <div class="udur__range" style="--p:${(iDef / (DUR.length - 1)).toFixed(4)};--max:${DUR.length - 1}">
            <span class="udur__bubble" aria-hidden="true" data-udur-bubble>${DEF} days</span>
            <span class="udur__track" aria-hidden="true">${DUR.map((_, k) => `<i style="--k:${k}"></i>`).join('')}</span>
            <input class="udur__input" type="range" min="0" max="${DUR.length - 1}" step="1" value="${iDef}" aria-labelledby="udur-q1" aria-valuetext="${DEF} days: ${x0.mk} nights in Makkah, ${x0.md} in Madinah" data-udur-range>
            <div class="udur__stops" aria-hidden="true">
              ${DUR.map(stop).join('\n              ')}
            </div>
          </div>
        </div>
        <fieldset class="udur__step">
          <legend class="udur__q"><span class="udur__n">2</span>Hotel level</legend>
          <div class="useg">
            ${HOTELS.map(hotel).join('\n            ')}
            <span class="useg__glide" aria-hidden="true"></span>
          </div>
        </fieldset>
        <div class="udur__step">
          <p class="udur__q" id="udur-q3"><span class="udur__n">3</span>How many pilgrims?</p>
          <div class="ustep">
            <button class="ustep__btn" type="button" data-udur-pax="-1" aria-label="One pilgrim fewer">{{icon minus}}</button>
            <output class="ustep__val" aria-labelledby="udur-q3" aria-live="polite" data-udur-pax-out>${PAX}</output>
            <button class="ustep__btn" type="button" data-udur-pax="1" aria-label="One pilgrim more">{{icon plus}}</button>
            <span class="ustep__unit" data-udur-pax-unit>pilgrims</span>
          </div>
        </div>
        <p class="udur__note">{{icon receipt}}<span>Flexible nights, with a written quote before you pay.</span></p><!-- shortened 23 Nov, user request -->
      </div>
      <div class="udur__plan">
        <div class="udur__head">
          <p class="udur__chips"><span data-udur-hotel-chip>${hDef.name} hotels</span><span data-udur-pax-chip>${PAX} pilgrims</span></p>
        </div>
        <div class="udur__panels">
${DUR.map(panel).join('\n')}
        </div>
        <div class="udur__cta">
          <a class="btn btn--primary" href="#get-a-quote" data-quote-pick="Umrah package" data-quote-note="${attr(quoteNote(x0, hDef, PAX))}" data-quote-travellers="${PAX}" data-udur-quote>Get a quote for this plan</a>
          <a class="btn btn--glass" href="#" data-wa data-wa-msg="${attr(waMsg(x0, hDef, PAX))}" data-udur-wa>{{icon whatsapp}}Ask on WhatsApp</a>
        </div>
      </div>
    </div>
  </div>
</section>
`;
writeFileSync(join(DIR, 'durations.html'), durations);

/* ---------- Package types (tiles + sheets) ---------- */
const TYPES = [
  { k: 'economy', icon: 'bus', name: 'Economy Umrah', short: 'Economy', sub: 'Shuttle to the Haram', img: '1693590614566-1d3ea9ef32f7', alt: 'Pilgrims in the courtyard of Masjid al-Haram, Makkah',
    lead: 'Our most affordable option, with clean, comfortable hotels a short shuttle ride from the Haram.',
    gets: ['Clean, comfortable hotels with a Haram shuttle', 'Quad, triple or double rooms', 'Coach transfers & Makkah–Madinah transport', 'Ziyarat in Makkah & Madinah'],
    best: 'Younger pilgrims, and anyone who wants the blessing of Umrah on a careful budget.' },
  { k: '4-star', icon: 'hotel', name: '4-Star Umrah', short: '4-Star', sub: 'Walk to every prayer', img: '1580418827493-f2b22c0a76cb', alt: 'Hotels and the clock tower beside Masjid al-Haram, Makkah',
    lead: 'The best balance of comfort and value, with hotels close enough to walk to every prayer.',
    gets: ['4-star hotels within walking distance of the Haram', 'Breakfast at most hotels', 'Coach transfers & Makkah–Madinah transport', 'Ziyarat in Makkah & Madinah'],
    best: 'Families and pilgrims who want to walk to every prayer at a sensible price.' },
  { k: '5-star', icon: 'star', name: '5-Star & VIP Umrah', short: '5-Star & VIP', sub: 'Steps from the Haram', img: '1771170975771-0c14516310b1', alt: 'The Abraj Al Bait clock tower above Masjid al-Haram, Makkah',
    lead: 'Premium hotels steps from the Haram, many in the Abraj Al Bait (Clock Tower) area.',
    gets: ['5-star hotels steps from the Haram', 'Private airport transfers', 'The Haramain high-speed train as an option', 'Ziyarat in Makkah & Madinah'],
    best: 'Elderly pilgrims, and families who want the shortest walk to the mosque.' },
  { k: 'family', icon: 'users', name: 'Family Umrah', short: 'Family', sub: 'Everyone together', img: '1572358899655-f63ece97bfa5', alt: 'Pilgrims walking in the courtyard of Masjid an-Nabawi, Madinah',
    lead: 'Family rooms, child pricing and help for elderly parents, planned so the whole family stays together.',
    gets: ['Family rooms planned around you', 'Child pricing', 'Wheelchair assistance for elders', 'Transport that keeps you together'],
    best: 'Parents, children and grandparents travelling as one group.' },
  { k: 'two', icon: 'heart', name: 'Umrah for 2 Persons', short: 'For 2 persons', sub: 'A double room', img: '1591604129939-f1efa4d9f7fa', alt: 'Masjid an-Nabawi in Madinah in the warm evening light',
    lead: 'Popular with married couples and pairs of friends: a double room, with every other service the same as our group packages.',
    gets: ['A double room, economy to 5-star', 'Umrah visa & return flights', 'Transfers & Makkah–Madinah transport', 'Ziyarat in both cities'],
    best: 'Married couples, and two friends or relatives travelling together.' },
  { k: 'group', icon: 'compass', name: 'Group Umrah', short: 'Group', sub: 'With a group leader', img: '1591004272853-1462c050dca8', alt: 'Umrah pilgrims around the Kaaba in Masjid al-Haram, Makkah',
    lead: 'Fixed-date departures with a group leader who guides you through every ritual.',
    gets: ['Fixed departure dates', 'A group leader for every ritual', 'Women-friendly groups & room sharing', 'Guidance in Urdu before you fly'],
    best: 'First-time pilgrims, women travelling without family, and anyone who prefers company.' },
  { k: 'ramadan', icon: 'moon', name: 'Ramadan Umrah', short: 'Ramadan', sub: 'Book early', img: '1780265861345-a787b955b505', alt: 'Masjid al-Haram at night during Ramadan',
    lead: 'Ramadan {{season ramadan-hijri}} AH is expected to begin around {{season ramadan-start}}, subject to moon sighting. The Prophet ﷺ said that Umrah in Ramadan is equal in reward to Hajj (Sahih al-Bukhari and Sahih Muslim).',
    gets: ['Ramadan dates of your choice, including the last ten nights', 'Hotels near the Haram, booked early', 'Visa, flights & transport included', 'Guidance in Urdu before you fly'],
    best: 'Pilgrims seeking the greatest reward. Hotels near the Haram sell out months ahead, so plan early.' },
];
// Ramadan dates are {{season}} shortcodes (build.mjs, assets/js/seasons.js), so they move on to the next Ramadan by
// themselves. No year in the names (client request 27 Nov: "Ramadan packages", not "Ramadan 2027"); `plain`, when
// set, is the name for attributes (the quote note, the WhatsApp message).
const tile = (t, i) => `      <li data-reveal style="--d:${i % 4}">
        <button class="cx" type="button" data-cs-open="cs-u-${t.k}" aria-haspopup="dialog" aria-controls="cs-u-${t.k}">
          <span class="cx__flag cx__flag--more">{{icon ${t.icon}}}</span>
          <span class="cx__meta"><strong>${esc(t.short)}</strong><small>${esc(t.sub)}</small></span>
          <span class="cx__go">{{icon plus}}</span>
        </button>
      </li>`;
const sheet = (t) => `<dialog class="cs cs--umrah" id="cs-u-${t.k}" aria-labelledby="cs-u-${t.k}-t">
  <div class="cs__scrim" data-cs-close></div>
  <div class="cs__box">
    <button class="cs__close" type="button" data-cs-close aria-label="Close">{{icon close}}</button>
    <div class="cs__head cs__head--photo">
      {{img id="${t.img}" ratio="16/9" widths="480,800,1200" sizes="(min-width: 760px) 720px, 100vw" w="800" alt="${attr(t.alt)}"}}
      <div class="cs__title">
        <span class="cs__flag cs__flag--icon">{{icon ${t.icon}}}</span>
        <div><h3 id="cs-u-${t.k}-t">${esc(t.name)}</h3><p>${esc(t.sub)}</p></div>
      </div>
    </div>
    <div class="cs__body" data-native-scroll>
      <p class="cs__lead">${esc(t.lead)}</p>
      <div class="cs__cols">
        <div class="cs__col">
          <h4>{{icon kaaba}}What you get</h4>
          <ul class="cs__list">
${t.gets.map((g) => `            <li>{{icon check}}${esc(g)}</li>`).join('\n')}
          </ul>
        </div>
        <div class="cs__col">
          <h4>{{icon users}}Best for</h4>
          <p>${esc(t.best)}</p>
          <p class="cs__note">Choose 7 to 28 days. We confirm your hotels, dates and price in a written quotation before you pay.</p>
        </div>
      </div>
      <div class="cs__inc">
        <p>Every package includes</p>
        <ul>
          <li>{{icon passport}}Umrah visa</li>
          <li>{{icon plane}}Return flights</li>
          <li>{{icon hotel}}Hotels</li>
          <li>{{icon bus}}Transport</li>
          <li>{{icon compass}}Ziyarat</li>
        </ul>
      </div>
    </div>
    <div class="cs__cta">
      <a class="btn btn--primary" href="#get-a-quote" data-quote-pick="Umrah package" data-quote-note="${attr(t.plain || t.name)} package"${t.k === 'two' ? ' data-quote-travellers="2"' : ''}>Get a quote</a>
      <a class="btn btn--outline" href="#" data-wa data-wa-msg="${attr(WA + `I'd like details of your ${t.plain || t.name} packages.`)}">{{icon whatsapp}}Ask our team</a>
    </div>
  </div>
</dialog>
`;
const types = `<!-- ============ UMRAH · PACKAGE TYPES (the same tiles and sheets as the home page's country sections:
     main.js "Country sheets", css "COUNTRIES"; umrah.css "Package types"). Written by tools/umrah.mjs: edit the data
     there, not here. No prices (client request). ============ -->
<section class="cx-sec section" id="umrah-package-types" aria-labelledby="utypes-title">
  <div class="container">
    <div class="section-head section-head--split">
      <h2 id="utypes-title" data-reveal>Umrah Packages for Every Pilgrim</h2>
      <p class="section-head__lead" data-reveal style="--d:1">Pick your hotel level and the way you travel. Tap a package to see what is included.</p>
    </div>
    <ul class="cx-grid">
${TYPES.map(tile).join('\n')}
      <li data-reveal style="--d:3">
        <a class="cx cx--more" href="#" data-wa data-wa-msg="${attr(WA + "I'd like a custom Umrah package.")}">
          <span class="cx__flag cx__flag--more">{{icon whatsapp}}</span>
          <span class="cx__meta"><strong>Custom Umrah</strong><small>Ask on WhatsApp</small></span>
          <span class="cx__go">{{icon arrow-up-right}}</span>
        </a>
      </li>
    </ul>
  </div>
</section>

${TYPES.map(sheet).join('\n')}`;
writeFileSync(join(DIR, 'types.html'), types);
console.log('wrote durations.html and types.html');
