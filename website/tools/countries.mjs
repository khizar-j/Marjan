// Writes partials/v2/tour-visas.html and partials/v2/visa-files.html (client priorities 1 and 2, Nov 2026).
// Edit the country data below, then run from website/src:  node ../tools/countries.mjs partials/v2  (and rebuild).
// Each country is a compact tile; tapping it opens a sheet (<dialog>) with the full details.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const DIR = process.argv[2];
const esc = (s) => s.replace(/&(?!amp;)/g, '&amp;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const flag = (cc, cls = 'flag') => `<img class="${cls}" src="/assets/img/flags/${cc}.svg" width="40" height="30" alt="" loading="lazy" decoding="async">`;
const WA = "Assalam o Alaikum Marjan Travel & Tours! ";

/* ---------- 1 · Tour packages & visit visas ---------- */
const TOURS = [
  { cc: 'az', name: 'Azerbaijan', sub: 'Baku, Gabala, Shahdag', img: '1596306499300-0b7b1689b9f6', alt: 'The Flame Towers above Baku, Azerbaijan',
    tour: ['Baku Old City & the Flame Towers', 'Gabala cable cars & Nohur Lake', 'Shahdag resort, with snow in winter', 'Gobustan rock art & mud volcanoes'],
    visa: 'Azerbaijan e-visa, applied for online, so there is no embassy visit.' },
  { cc: 'th', name: 'Thailand', sub: 'Bangkok, Phuket, Pattaya', img: '1506665531195-3566af2b4dfa', alt: 'Boats in a bay on Phi Phi Island, Thailand',
    tour: ['Bangkok temples & floating markets', 'Phuket & the Phi Phi Islands', 'Pattaya beaches & Coral Island', 'Safari World & Dream World'],
    visa: 'Thailand tourist visa (e-visa), with your file checked by us before it is submitted.' },
  { cc: 'id', name: 'Indonesia', sub: 'Bali', img: '1604999333679-b86d54738315', alt: 'Pura Ulun Danu Bratan temple on Lake Bratan, Bali, Indonesia',
    tour: ['Ubud rice terraces & Monkey Forest', 'Tanah Lot & Uluwatu at sunset', 'Nusa Dua, Kuta & Seminyak beaches', 'A day trip to Nusa Penida'],
    visa: 'Indonesia visit visa (e-visa), applied for online.' },
  { cc: 'my', name: 'Malaysia', sub: 'Kuala Lumpur, Langkawi', img: '1596422846543-75c6fc197f07', alt: 'The Petronas Towers and the Kuala Lumpur skyline at dusk',
    tour: ['Petronas Towers & a KL city tour', 'Genting Highlands & Batu Caves', 'Langkawi cable car & island hopping', 'Day trips to Putrajaya & Malacca'],
    visa: 'Malaysia eVisa, applied for online, so there is no embassy visit.' },
  { cc: 'ae', name: 'Dubai', sub: 'United Arab Emirates', img: '1518684079-3c830dcef090', alt: 'Burj Al Arab on the coast of Dubai',
    tour: ['Desert safari & barbecue dinner', 'Burj Khalifa & the Dubai Fountain', 'Dhow cruise in Dubai Marina', 'Abu Dhabi & the Grand Mosque'],
    visa: 'UAE visit visas for 30 or 60 days, applied for online, so there is no embassy visit.' },
  { cc: 'lk', name: 'Sri Lanka', sub: 'Kandy, Ella, Galle', img: '1566296314736-6eaac1ca0cb9', alt: 'A blue train crossing the Nine Arch Bridge in Ella, Sri Lanka',
    tour: ['Kandy & the Temple of the Tooth', 'Train to Ella through tea country', 'Sigiriya Rock Fortress', 'Galle Fort & south coast beaches'],
    visa: 'Sri Lanka ETA (electronic travel authorisation), applied for online.' },
  { cc: 'sg', name: 'Singapore', sub: 'Marina Bay, Sentosa', img: '1565967511849-76a60a516170', alt: 'The Merlion and Marina Bay Sands lit up at night, Singapore',
    tour: ['Marina Bay & Gardens by the Bay', 'Sentosa & Universal Studios', 'Night Safari & Singapore Zoo', 'Chinatown & Orchard Road shopping'],
    visa: 'Singapore visit visa (e-visa), applied for online.' },
];

const tourTile = (c, i) => `      <li data-reveal style="--d:${i % 4}">
        <button class="cx" type="button" data-cs-open="cs-${c.cc}" aria-haspopup="dialog" aria-controls="cs-${c.cc}">
          <span class="cx__flag">${flag(c.cc)}</span>
          <span class="cx__meta"><strong>${esc(c.name)}</strong><small>Tour &amp; visa</small></span>
          <span class="cx__go">{{icon plus}}</span>
        </button>
      </li>`;

const tourSheet = (c) => `<dialog class="cs cs--tour" id="cs-${c.cc}" aria-labelledby="cs-${c.cc}-t">
  <div class="cs__scrim" data-cs-close></div>
  <div class="cs__box">
    <button class="cs__close" type="button" data-cs-close aria-label="Close">{{icon close}}</button>
    <div class="cs__head cs__head--photo">
      {{img id="${c.img}" ratio="16/9" widths="480,800,1200" sizes="(min-width: 760px) 720px, 100vw" w="800" alt="${attr(c.alt)}"}}
      <div class="cs__title">
        <span class="cs__flag">${flag(c.cc)}</span>
        <div><h3 id="cs-${c.cc}-t">${esc(c.name)}</h3><p>${esc(c.sub)}</p></div>
      </div>
    </div>
    <div class="cs__body" data-native-scroll>
      <div class="cs__cols">
        <div class="cs__col">
          <h4>{{icon globe}}Tour package</h4>
          <ul class="cs__list">
${c.tour.map((t) => `            <li>{{icon check}}${esc(t)}</li>`).join('\n')}
          </ul>
          <p class="cs__note">Private, family, honeymoon or group: you choose the dates, hotels and pace.</p>
        </div>
        <div class="cs__col">
          <h4>{{icon passport}}Visit visa</h4>
          <p>${esc(c.visa)} Book it with your package or on its own.</p>
          <p class="cs__note">We check the latest rules and give you your exact document list before you apply.</p>
        </div>
      </div>
      <div class="cs__inc">
        <p>Every package can include</p>
        <ul>
          <li>{{icon plane}}Return flights</li>
          <li>{{icon hotel}}Hotels</li>
          <li>{{icon passport}}Visa</li>
          <li>{{icon bus}}Airport transfers</li>
          <li>{{icon compass}}Sightseeing tours</li>
        </ul>
      </div>
      <p class="cs__links"><a class="link-arrow" href="/services/international-tour-packages/">International tour packages {{icon arrow-right}}</a><a class="link-arrow" href="/services/visa-consultancy/">Visa services {{icon arrow-right}}</a></p>
    </div>
    <div class="cs__cta">
      <a class="btn btn--primary" href="#get-a-quote" data-quote-pick="International tour package" data-quote-note="${attr(`${c.name} tour package and visa`)}">{{icon mail}}Get a quote</a>
      <a class="btn btn--outline" href="#" data-wa data-wa-msg="${attr(`${WA}I'd like details of your ${c.name} tour packages and visa.`)}">{{icon whatsapp}}Ask our team</a>
    </div>
  </div>
</dialog>`;

const tourHtml = `<!-- ============ 3b · TOUR PACKAGES & VISIT VISAS (client priority 1, Nov 2026)
     Compact flag tiles; each opens a sheet with the full details (main.js "Country sheets"). No prices. ============ -->
<section class="cx-sec section" id="tour-packages-visas" aria-labelledby="cx-title">
  <div class="container">
    <div class="section-head section-head--split">
      <h2 id="cx-title" data-reveal>International Tour Packages &amp; Visit Visas</h2>
      <p class="section-head__lead" data-reveal style="--d:1">Our most-booked countries, as a complete holiday or just the visa. Tap a country to see what is included.</p>
    </div>
    <ul class="cx-grid">
${TOURS.map(tourTile).join('\n')}
      <li data-reveal style="--d:3">
        <a class="cx cx--more" href="#" data-wa data-wa-msg="${attr(`${WA}I'd like a tour package or visa for another country.`)}">
          <span class="cx__flag cx__flag--more">{{icon globe}}</span>
          <span class="cx__meta"><strong>Any country</strong><small>Ask on WhatsApp</small></span>
          <span class="cx__go">{{icon arrow-up-right}}</span>
        </a>
      </li>
    </ul>
  </div>
</section>

${TOURS.map(tourSheet).join('\n\n')}
`;

/* ---------- 2 · Visa file processing ---------- */
const SCHENGEN = [['at', 'Austria'], ['be', 'Belgium'], ['bg', 'Bulgaria'], ['hr', 'Croatia'], ['cz', 'Czechia'], ['dk', 'Denmark'], ['ee', 'Estonia'], ['fi', 'Finland'], ['fr', 'France'], ['de', 'Germany'], ['gr', 'Greece'], ['hu', 'Hungary'], ['is', 'Iceland'], ['it', 'Italy'], ['lv', 'Latvia'], ['li', 'Liechtenstein'], ['lt', 'Lithuania'], ['lu', 'Luxembourg'], ['mt', 'Malta'], ['nl', 'Netherlands'], ['no', 'Norway'], ['pl', 'Poland'], ['pt', 'Portugal'], ['ro', 'Romania'], ['sk', 'Slovakia'], ['si', 'Slovenia'], ['es', 'Spain'], ['se', 'Sweden'], ['ch', 'Switzerland']];
const FILES = [
  { cc: 'us', name: 'USA', full: 'United States', type: 'B1/B2 visit visa', quote: 'USA visa file', img: '1534430480872-3498386e7856', alt: 'The Manhattan skyline, New York',
    about: 'US visit visas (B1/B2) for tourism, family visits and business, with an interview at the US Embassy or Consulate.',
    we: ['DS-160 form filled in & checked', 'Interview appointment booked', 'Supporting documents reviewed', 'Interview preparation session'] },
  { cc: 'gb', name: 'UK', full: 'United Kingdom', type: 'Standard Visitor visa', quote: 'UK visa file', img: '1505761671935-60b3a7427bad', alt: 'Big Ben and the Houses of Parliament, London',
    about: 'UK Standard Visitor visas for tourism, family visits and business, with biometrics at the visa application centre.',
    we: ['Online application form completed', 'Cover letter & travel itinerary', 'Bank & income documents reviewed', 'Biometrics appointment booked'] },
  { cc: 'ca', name: 'Canada', full: 'Canada', type: 'Visitor visa', quote: 'Canada visa file', img: '1503614472-8c93d56e92ce', alt: 'Moraine Lake in the Rocky Mountains, Banff, Canada',
    about: 'Canadian visitor visas for tourism, family visits and business, applied for online, with biometrics at the visa application centre.',
    we: ['Online application completed', 'Invitation & family papers checked', 'Proof of funds & home ties reviewed', 'Biometrics appointment booked'] },
  { cc: 'eu', name: 'Schengen', full: 'Schengen area', type: '29 European countries', quote: 'Schengen visa file', img: '1499856871958-5b9627545d1a', alt: 'The Pont Alexandre III bridge in Paris at dusk',
    about: 'One short-stay Schengen visa (up to 90 days) for tourism, family visits or business, valid across 29 European countries.',
    we: ['Visa centre appointment booked', 'Application form & cover letter', 'Hotel & flight reservations', 'Schengen travel insurance'] },
];

const fileTile = (c, i) => `        <li data-reveal style="--d:${i}">
          <button class="vf" type="button" data-cs-open="cs-${c.cc}" aria-haspopup="dialog" aria-controls="cs-${c.cc}">
            <span class="vf__flag">${flag(c.cc)}</span>
            <span class="vf__meta"><strong>${esc(c.name)}</strong><small>${esc(c.type)}</small></span>
${c.cc === 'eu' ? `            <span class="vf__mini" aria-hidden="true">${['fr', 'de', 'it', 'es', 'nl'].map((x) => flag(x, 'flag')).join('')}<em>+24</em></span>\n` : ''}            <span class="vf__go">View details {{icon plus}}</span>
          </button>
        </li>`;

const fileSheet = (c) => `<dialog class="cs cs--file" id="cs-${c.cc}" aria-labelledby="cs-${c.cc}-t">
  <div class="cs__scrim" data-cs-close></div>
  <div class="cs__box">
    <button class="cs__close" type="button" data-cs-close aria-label="Close">{{icon close}}</button>
    <div class="cs__head cs__head--photo">
      {{img id="${c.img}" ratio="16/9" widths="480,800,1200" sizes="(min-width: 760px) 720px, 100vw" w="800" alt="${attr(c.alt)}"}}
      <div class="cs__title">
        <span class="cs__flag">${flag(c.cc)}</span>
        <div><h3 id="cs-${c.cc}-t">${esc(c.name)} visa</h3><p>Visa file processing · ${esc(c.type)}</p></div>
      </div>
    </div>
    <div class="cs__body" data-native-scroll>
      <p class="cs__lead">${esc(c.about)}</p>
      <div class="cs__col">
        <h4>{{icon check}}What we do for you</h4>
        <ul class="cs__list cs__list--2">
          <li>{{icon check}}File reviewed, weak points flagged</li>
${c.we.map((t) => `          <li>{{icon check}}${esc(t)}</li>`).join('\n')}
        </ul>
      </div>
${c.cc === 'eu' ? `      <div class="cs__col">
        <h4>{{icon globe}}The 29 Schengen countries</h4>
        <ul class="cs__flags">
${SCHENGEN.map(([cc, n]) => `          <li>${flag(cc)}${n}</li>`).join('\n')}
        </ul>
      </div>
` : ''}      <p class="cs__honest">{{icon shield}}<span>No agent can guarantee a visa: the embassy decides. We make sure your file is complete, accurate and honest.</span></p>
      <p class="cs__links"><a class="link-arrow" href="/services/visa-consultancy/">Visa consultancy &amp; processing {{icon arrow-right}}</a></p>
    </div>
    <div class="cs__cta">
      <a class="btn btn--primary" href="#get-a-quote" data-quote-pick="Visa file processing" data-quote-note="${attr(c.quote)}">{{icon mail}}Get a quote</a>
      <a class="btn btn--outline" href="#" data-wa data-wa-msg="${attr(`${WA}I'd like help with my ${c.name} visa file.`)}">{{icon whatsapp}}Ask our team</a>
    </div>
  </div>
</dialog>`;

const fileHtml = `<!-- ============ 3c · VISA FILE PROCESSING (client priority 2, Nov 2026): USA, UK, Canada and Schengen.
     A navy panel with four tiles; each opens a sheet with the full details (main.js "Country sheets"). No prices. ============ -->
<section class="vf-sec section" id="visa-file-processing" aria-labelledby="vf-title">
  <div class="container">
    <div class="vf-panel">
      <div class="vf-panel__head">
        <h2 id="vf-title" data-reveal>Visa File Processing <em>USA, UK, Canada &amp; Schengen</em></h2>
        <p data-reveal style="--d:1">Complete, carefully checked visa files: we review your documents, fill in the forms, book your appointment and prepare you for the interview.</p>
      </div>
      <ul class="vf-grid">
${FILES.map(fileTile).join('\n')}
      </ul>
    </div>
  </div>
</section>

${FILES.map(fileSheet).join('\n\n')}
`;

writeFileSync(join(DIR, 'tour-visas.html'), tourHtml);
writeFileSync(join(DIR, 'visa-files.html'), fileHtml);
console.log('wrote tour-visas.html and visa-files.html');
