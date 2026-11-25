// Marjan Travel & Tours: zero-dependency static build.
// Usage: node build.mjs   (reads src/, writes plain HTML to dist/)
//
// Shortcodes available in src/pages/** and src/partials/**:
//   {{> name}}                       include src/partials/name.html
//   {{> name key="value"}}           the same, filling the partial's {{arg key|default}} slots (default when not given)
//   {{icon name}} / {{icon name cls}} inline SVG icon from the sprite
//   {{ph KEY}} / {{ph KEY|sample}}   placeholder token, e.g. [CITY]
//   {{img id="..." alt="..." ratio="4/3" sizes="..." [eager] [defer] [class="..."] [widths="..."]
//         [phone="4/3" phone-y=".6" phone-sizes="..."]}}
//                                    responsive Unsplash image (AVIF/WebP via auto=format); phone= adds a
//                                    phone-only crop (see img() below)
//   {{season key}}                   a Ramadan / Hajj / Umrah season date (keys in assets/js/seasons.js), as
//                                    <span data-season="key">, which main.js brings up to date in the browser
//   {{season-text key}}              the same as plain text, for places a <span> can't go: <title>, meta, JSON-LD,
//                                    attributes, <option> (these change only when the site is built again)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, cpSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'dist');

// Sample values used ONLY by the "Show sample data" preview switch.
// They are not real business details. Replace placeholders in src/ with real data before launch.
const SAMPLE = {
  'CITY': 'Lahore',
  'PHONE': '+92 300 0000000',
  'WHATSAPP': '+92 300 0000000',
  'EMAIL': 'hello@example.com',
  'FULL ADDRESS': 'Office 00, Main Boulevard, Gulberg',
  'OFFICE HOURS': 'Mon–Sat, 10am–7pm',
  'LICENSING BODY': 'DTS',
  'LICENCE NO.': '0000',
  'MORA REG. NO.': '0000',
  'IATA CODE': 'IATA 00-0 0000',
  'YEARS': '12',
  'NUMBER': '8,500',
  'RATING': '4.9',
  'YEAR FOUNDED': '2014',
  'SHARING TYPE': 'quad',
  'LAST UPDATED DATE': '16 November 2026',
  'SUPPORT HOURS': '9am to 11pm',
  'RESPONSE TIME': '2 hours',
  'DAYS': '15',
};

// Ramadan and Hajj dates for {{season}}: the same file the browser runs (assets/js/seasons.js), with today as the day
const seasonBox = {};
vm.runInNewContext(readFileSync(join(SRC, 'assets', 'js', 'seasons.js'), 'utf8'), seasonBox);
const SEASON = seasonBox.MarjanSeasons;
if (!SEASON.ok) throw new Error('seasons.js: this Node has no Islamic (Umm al-Qura) calendar');
const season = (key) => {
  const v = SEASON.text(key.trim());
  if (!v) throw new Error(`{{season ${key}}}: unknown key`);
  return v;
};

const unsplash = (id, w, h, q) =>
  `https://images.unsplash.com/photo-${id}?auto=format&amp;fit=crop&amp;w=${w}${h ? `&amp;h=${h}` : ''}&amp;q=${q}`;

function parseAttrs(str) {
  const o = {};
  str.replace(/([\w-]+)(?:="([^"]*)")?/g, (_, k, v) => { o[k] = v === undefined ? true : v; });
  return o;
}

function img(a) {
  const widths = String(a.widths || '480,800,1200,1600').split(',').map(Number);
  const [rw, rh] = String(a.ratio || '3/2').split('/').map(Number);
  const q = a.q || 70;
  const h = (w) => Math.round((w * rh) / rw);
  // y=".75" [x=".6"] [zoom="1.2"]: Unsplash cuts the crop around that point in the photo (0 top/left, 1 bottom/right)
  // instead of the middle, zoomed in by `zoom` if set: for a photo whose subject sits low or high (the International
  // closing card's boats and lagoon) or with something to leave out at an edge (a hand at the left of the Corporate
  // closing card's Upper Kachura photo), 23 Nov
  const fy0 = a.y || a.x || a.zoom
    ? `&amp;crop=focalpoint&amp;fp-x=${a.x || '.5'}&amp;fp-y=${a.y || '.5'}${a.zoom ? `&amp;fp-z=${a.zoom}` : ''}` : '';
  const srcset = widths.map((w) => `${unsplash(a.id, w, h(w), q)}${fy0} ${w}w`).join(', ');
  const fw = widths[Math.min(1, widths.length - 1)];
  const src = unsplash(a.id, fw, h(fw), q) + fy0;
  const W = Number(a.w) || 1200;
  const common = `alt="${a.alt || ''}" width="${W}" height="${h(W)}"${a.class ? ` class="${a.class}"` : ''}`;
  const sizes = a.sizes || '100vw';
  if (a.defer) return `<img data-src="${src}" data-srcset="${srcset}" sizes="${sizes}" ${common} decoding="async">`;
  const load = a.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  const tag = `<img src="${src}" srcset="${srcset}" sizes="${sizes}" ${common} ${load} decoding="async">`;
  if (!a.phone) return tag;
  // phone="4/3" [phone-y=".6"]: phones get their own crop, cut by Unsplash around that height in the photo (0 top,
  // 1 bottom), so a photo shown short on a phone doesn't download the full tall picture
  const [pw, ph] = String(a.phone).split('/').map(Number);
  const fy = a['phone-y'] ? `&amp;crop=focalpoint&amp;fp-x=.5&amp;fp-y=${a['phone-y']}` : '';
  const pset = widths.map((w) => `${unsplash(a.id, w, Math.round((w * ph) / pw), q)}${fy} ${w}w`).join(', ');
  return `<picture><source media="(max-width: 639.98px)" srcset="${pset}" sizes="${a['phone-sizes'] || '100vw'}" width="${W}" height="${Math.round((W * ph) / pw)}">${tag}</picture>`;
}

// {{faq-schema umrah/faq}}: the FAQPage JSON-LD for that FAQ partial, read from its questions (<details class="qa">:
// the <h3> in the summary and the .qa__a text), so the schema always says word for word what the page shows
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };
const plain = (s) => s.replace(/<\/?(?:p|li|ul|ol|br|div|h[1-6])\b[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&(#?\w+);/g, (m, e) => ENT[e] ?? m).replace(/\s+/g, ' ').replace(/ ([.,;:!?)])/g, '$1').trim();
function faqSchema(name) {
  const html = render(readFileSync(join(SRC, 'partials', `${name}.html`), 'utf8'));
  const qs = [...html.matchAll(/<details class="qa"[\s\S]*?<summary>\s*<h3>([\s\S]*?)<\/h3>[\s\S]*?<div class="qa__a">([\s\S]*?)<\/div>\s*<\/details>/g)];
  if (!qs.length) throw new Error(`faq-schema: no questions in partials/${name}.html`);
  const mainEntity = qs.map(([, q, a]) => ({ '@type': 'Question', name: plain(q), acceptedAnswer: { '@type': 'Answer', text: plain(a) } }));
  return JSON.stringify({ '@type': 'FAQPage', mainEntity }, null, 2).replace(/\n/g, '\n    ');
}

// {{photo visa alt="…"}}: a service photo from assets/img/services (the same three cuts as the Umrah page's "at a
// glance" photo): a 4:3 cut on phones, 2:1 on tablets and the tall 15:16 one beside the text from 960px. The widths
// are the files that exist, so a photo with no 1200 file simply stops at 900. Since 24 Nov (user request: one file
// per photo and ratio) each cut has a single file, its largest, so every set below holds one file.
function photo(a) {
  const dir = join(SRC, 'assets', 'img', 'services');
  const have = (w, cut = '') => existsSync(join(dir, `${a.name}${cut}-${w}.webp`));
  const url = (w, cut = '') => `/assets/img/services/${a.name}${cut}-${w}.webp`;
  const set = (ws, cut) => ws.filter((w) => have(w, cut)).map((w) => `${url(w, cut)} ${w}w`).join(', ');
  const big = [600, 900, 1140, 1200].filter((w) => have(w));
  if (!big.length) throw new Error(`photo: no files for ${a.name}`);
  const W = big[big.length - 1];
  return `<picture>`
    + `<source media="(max-width: 639.98px)" type="image/webp" srcset="${set([480, 840], '-t')}" sizes="calc(100vw - 32px)" width="840" height="630">`
    + `<source media="(max-width: 959.98px)" type="image/webp" srcset="${set([800, 1200], '-m')}" sizes="92vw" width="1200" height="600">`
    + `<img src="${url(W)}" srcset="${set(big)}" sizes="${a.sizes || '(min-width: 1320px) 540px, 42vw'}" width="${W}" height="${Math.round((W * 16) / 15)}" loading="lazy" decoding="async" alt="${a.alt || ''}">`
    + `</picture>`;
}

function render(html, depth = 0) {
  if (depth > 10) throw new Error('Include depth exceeded');
  html = html.replace(/\{\{>\s*([\w/-]+)((?:\s+[\w-]+="[^"]*")*)\s*\}\}/g, (_, name, a) => {
    const args = parseAttrs(a);
    const part = readFileSync(join(SRC, 'partials', `${name}.html`), 'utf8')
      .replace(/\{\{arg\s+([\w-]+)\|([^}]*)\}\}/g, (_, key, dflt) => args[key] ?? dflt);
    return render(part, depth + 1);
  });
  if (depth > 0) return html;
  return html
    .replace(/\{\{faq-schema\s+([\w/-]+)\s*\}\}/g, (_, name) => faqSchema(name))
    .replace(/\{\{img\s+([\s\S]+?)\}\}/g, (_, a) => img(parseAttrs(a)))
    .replace(/\{\{photo\s+([\w-]+)\s*([\s\S]*?)\}\}/g, (_, name, a) => photo({ ...parseAttrs(a), name }))
    .replace(/\{\{icon\s+([\w-]+)(?:\s+([\w -]+?))?\s*\}\}/g, (_, n, cls) =>
      `<svg class="i${cls ? ` ${cls}` : ''}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`)
    .replace(/\{\{ph\s+([^}|]+?)(?:\|([^}]*))?\s*\}\}/g, (_, key, sample) => {
      const s = sample ?? SAMPLE[key.trim()];
      return `<span class="ph"${s ? ` data-sample="${s}"` : ''}>[${key.trim()}]</span>`;
    })
    .replace(/\{\{season-text\s+([\w-]+)\s*\}\}/g, (_, key) => season(key))
    .replace(/\{\{season\s+([\w-]+)\s*\}\}/g, (_, key) => `<span data-season="${key}">${season(key)}</span>`);
}

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, 'assets'), join(OUT, 'assets'), { recursive: true });
// Site add-ons: the files in assets/css/site and assets/js/site are joined, in name order, into one
// assets/css/site.css and one assets/js/site.js (one request each). The folders themselves are not published.
for (const [dir, bundle] of [['css', 'site.css'], ['js', 'site.js']]) {
  const from = join(SRC, 'assets', dir, 'site');
  if (!existsSync(from)) continue;
  const parts = readdirSync(from).filter((f) => f.endsWith(`.${dir}`)).sort();
  writeFileSync(join(OUT, 'assets', dir, bundle), parts.map((f) => `/* ---- site/${f} ---- */\n${readFileSync(join(from, f), 'utf8')}`).join('\n'));
  rmSync(join(OUT, 'assets', dir, 'site'), { recursive: true, force: true });
}
for (const f of ['robots.txt', 'llms.txt', '_redirects']) {
  const p = join(SRC, f);
  if (existsSync(p)) cpSync(p, join(OUT, f));
}

// Cache-busting: every stylesheet and script link gets ?v=<8 hex of the file's content hash>, so a browser never
// pairs a new page with an old cached file (that once showed the V1 | V2 tabs as plain, unstyled text)
const stamps = new Map();
const bust = (html) => html.replace(/(["'])(\/assets\/(?:css|js)\/[\w.-]+\.(?:css|js))\1/g, (m, q, url) => {
  if (!stamps.has(url)) {
    const p = join(OUT, url);
    stamps.set(url, existsSync(p) ? createHash('md5').update(readFileSync(p)).digest('hex').slice(0, 8) : '');
  }
  return stamps.get(url) ? `${q}${url}?v=${stamps.get(url)}${q}` : m;
});

const pages = walk(join(SRC, 'pages'));
for (const file of pages) {
  const rel = relative(join(SRC, 'pages'), file);
  const out = join(OUT, rel);
  mkdirSync(dirname(out), { recursive: true });
  const html = bust(render(readFileSync(file, 'utf8')));
  const left = html.match(/\{\{[^}]*\}\}/g);
  if (left) console.warn(`  ! unresolved in ${rel}:`, [...new Set(left)].slice(0, 5));
  writeFileSync(out, html);
  console.log(`built ${rel}  (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
}

// sitemap.xml: every built page except noindex ones (the old /v2/ redirect), at its live URL.
const SITE = 'https://marjantravels.com';
const urls = pages
  .filter((file) => !/<meta name="robots" content="[^"]*noindex/.test(readFileSync(file, 'utf8')))
  .map((file) => '/' + relative(join(SRC, 'pages'), file).split('\\').join('/').replace(/index\.html$/, ''))
  .sort();
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>
`);
console.log(`built sitemap.xml  (${urls.length} pages)`);
