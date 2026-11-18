// Marjan Travel & Tours: zero-dependency static build.
// Usage: node build.mjs   (reads src/, writes plain HTML to dist/)
//
// Shortcodes available in src/pages/** and src/partials/**:
//   {{> name}}                       include src/partials/name.html
//   {{icon name}} / {{icon name cls}} inline SVG icon from the sprite
//   {{ph KEY}} / {{ph KEY|sample}}   placeholder token, e.g. [CITY]
//   {{img id="..." alt="..." ratio="4/3" sizes="..." [eager] [defer] [class="..."] [widths="..."]}}
//                                    responsive Unsplash image (AVIF/WebP via auto=format)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, cpSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
  const srcset = widths.map((w) => `${unsplash(a.id, w, h(w), q)} ${w}w`).join(', ');
  const fw = widths[Math.min(1, widths.length - 1)];
  const src = unsplash(a.id, fw, h(fw), q);
  const W = Number(a.w) || 1200;
  const common = `alt="${a.alt || ''}" width="${W}" height="${h(W)}"${a.class ? ` class="${a.class}"` : ''}`;
  const sizes = a.sizes || '100vw';
  if (a.defer) return `<img data-src="${src}" data-srcset="${srcset}" sizes="${sizes}" ${common} decoding="async">`;
  const load = a.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  return `<img src="${src}" srcset="${srcset}" sizes="${sizes}" ${common} ${load} decoding="async">`;
}

function render(html, depth = 0) {
  if (depth > 10) throw new Error('Include depth exceeded');
  html = html.replace(/\{\{>\s*([\w/-]+)\s*\}\}/g, (_, name) =>
    render(readFileSync(join(SRC, 'partials', `${name}.html`), 'utf8'), depth + 1));
  if (depth > 0) return html;
  return html
    .replace(/\{\{img\s+([\s\S]+?)\}\}/g, (_, a) => img(parseAttrs(a)))
    .replace(/\{\{icon\s+([\w-]+)(?:\s+([\w -]+?))?\s*\}\}/g, (_, n, cls) =>
      `<svg class="i${cls ? ` ${cls}` : ''}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`)
    .replace(/\{\{ph\s+([^}|]+?)(?:\|([^}]*))?\s*\}\}/g, (_, key, sample) => {
      const s = sample ?? SAMPLE[key.trim()];
      return `<span class="ph"${s ? ` data-sample="${s}"` : ''}>[${key.trim()}]</span>`;
    });
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
// Version 2 add-ons: the files in assets/css/v2 and assets/js/v2 are joined, in name order, into one
// assets/css/v2.css and one assets/js/v2.js (one request each). The folders themselves are not published.
for (const [dir, bundle] of [['css', 'v2.css'], ['js', 'v2.js']]) {
  const from = join(SRC, 'assets', dir, 'v2');
  if (!existsSync(from)) continue;
  const parts = readdirSync(from).filter((f) => f.endsWith(`.${dir}`)).sort();
  writeFileSync(join(OUT, 'assets', dir, bundle), parts.map((f) => `/* ---- v2/${f} ---- */\n${readFileSync(join(from, f), 'utf8')}`).join('\n'));
  rmSync(join(OUT, 'assets', dir, 'v2'), { recursive: true, force: true });
}
for (const f of ['robots.txt', 'llms.txt']) {
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
