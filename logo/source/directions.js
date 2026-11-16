// Four new logo directions built on the website palette; all lettering converted to outlines.
const opentype = require('opentype.js');
const fs = require('fs');
const OUT = __dirname + '/../svg/';
const F = n => opentype.loadSync(__dirname + '/node_modules/@fontsource/' + n);
const fraunces600 = F('fraunces/files/fraunces-latin-600-normal.woff');
const fraunces400i = F('fraunces/files/fraunces-latin-400-italic.woff');
const pjs800 = F('plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff');
const pjs700 = F('plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff');
const pjs600 = F('plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff');

const C = { coral: '#C9401F', coral5: '#F2603F', coral4: '#FF7A5C', coral1: '#FFE3D9', coral7: '#A8341A',
  sea: '#0B2429', sea95: '#071A1E', sea8: '#12343A', sea7: '#1B4A51', sand: '#FDFAF5', sand1: '#F7F0E5', sand2: '#EFE4D3', ink3: '#5B6A6D' };

function layout(font, str, size, tracking = 0) {
  const glyphs = font.stringToGlyphs(str), s = size / font.unitsPerEm;
  const adv = glyphs.map((g, i) => g.advanceWidth * s + (i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) * s + tracking * size : 0));
  return { glyphs, adv, w: adv.reduce((a, b) => a + b, 0) };
}
function text(font, str, x, y, size, { tracking = 0, anchor = 'start' } = {}) {
  const L = layout(font, str, size, tracking);
  let cx = anchor === 'middle' ? x - L.w / 2 : anchor === 'end' ? x - L.w : x;
  const path = new opentype.Path(), xs = [];
  L.glyphs.forEach((g, i) => { xs.push(cx); path.extend(g.getPath(cx, y, size)); cx += L.adv[i]; });
  return { d: path.toPathData(2), w: L.w, xs, bbox: path.getBoundingBox(), path };
}
function xform(cmds, fn) {
  return cmds.map(c => { const o = { ...c }; for (const [kx, ky] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']]) if (kx in c) { const [X, Y] = fn(c[kx], c[ky]); o[kx] = X; o[ky] = Y; } return o; });
}
function toD(cmds) {
  const f = v => (Math.round(v * 100) / 100).toString();
  return cmds.map(c => c.type === 'M' || c.type === 'L' ? c.type + f(c.x) + ' ' + f(c.y) : c.type === 'C' ? `C${f(c.x1)} ${f(c.y1)} ${f(c.x2)} ${f(c.y2)} ${f(c.x)} ${f(c.y)}` : c.type === 'Q' ? `Q${f(c.x1)} ${f(c.y1)} ${f(c.x)} ${f(c.y)}` : 'Z').join('');
}
// text around a circle; top = reads clockwise over the top, bottom = reads left-to-right under the bottom
function arcText(font, str, cx, cy, rMid, centerDeg, spanDeg, { tracking = 0.12, bottom = false } = {}) {
  const probe = layout(font, str, 10, tracking);
  const capH = (font.tables.os2.sCapHeight || font.unitsPerEm * 0.7) / font.unitsPerEm;
  let size = 10 * (spanDeg * Math.PI / 180 * rMid) / probe.w;
  const L = layout(font, str, size, tracking);
  const r = bottom ? rMid + capH * size / 2 : rMid - capH * size / 2;
  let s = 0, cmds = [];
  L.glyphs.forEach((g, i) => {
    const gw = g.advanceWidth * size / font.unitsPerEm, mid = s + gw / 2;
    const th = (centerDeg * Math.PI / 180) + (bottom ? -1 : 1) * (mid - L.w / 2) / r;
    const phi = th + (bottom ? -Math.PI / 2 : Math.PI / 2);
    const px = cx + r * Math.cos(th), py = cy + r * Math.sin(th), cs = Math.cos(phi), sn = Math.sin(phi);
    cmds = cmds.concat(xform(g.getPath(-gw / 2, 0, size).commands, (x, y) => [px + x * cs - y * sn, py + x * sn + y * cs]));
    s += L.adv[i];
  });
  return { d: toD(cmds), size };
}
const svg = (vb, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(v => Math.round(v * 10) / 10).join(' ')}" role="img" aria-labelledby="t"><title id="t">${title.replace(/&/g, '&amp;')}</title>${body}</svg>\n`;
const write = (name, s) => { fs.writeFileSync(OUT + name, s); console.log(name, (s.length / 1024).toFixed(1) + ' KB'); };
const tile = (bg, inner) => `<rect width="512" height="512" rx="112" fill="${bg}"/>${inner}`;

// ---------- A · Coral (the name: marjan = coral) ----------
const coralBranch = (stroke) => {
  const seg = (w, d) => `<path stroke-width="${w}" d="${d}"/>`;
  return `<g fill="none" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round">` +
    seg(13, 'M60 109C60 101 59.5 95 59 88') +
    seg(10.5, 'M59 88C51 82 45 75 41 65') + seg(10.5, 'M59 88C67 82 73 74 77 64') +
    seg(8, 'M41 65C38.5 57 35.5 50 30.5 43') + seg(8, 'M41 65C42.5 56 45.5 48 47.5 39') +
    seg(8, 'M77 64C80.5 56 84.5 50 89.5 44') + seg(8, 'M77 64C75 55 72.5 47 70.5 38') +
    seg(6, 'M30.5 43C28 38 26.5 33 26.5 27') + seg(6, 'M34 48C28 46.5 23 43 19 37') +
    seg(6, 'M47.5 39C48.5 34 48.5 29 47.5 23') + seg(6, 'M70.5 38C69.5 33 69.5 27 70.5 21') +
    seg(6, 'M89.5 44C92.5 40 95 36 96.5 30') + seg(6, 'M86 48C92 48 97 46 101.5 42') + `</g>`;
};
const markA = (disc, stroke) => `<circle cx="60" cy="62" r="56" fill="${disc}"/>${coralBranch(stroke)}`;
function dirA(dark) {
  const t1 = text(fraunces600, 'Marjan', 142, 76, 74, { tracking: -0.01 });
  const t2 = text(pjs700, 'TRAVEL & TOURS', 145, 104, 13.5, { tracking: 0.36 });
  const W = 142 + Math.max(t1.w, t2.w + 3);
  const body = (dark ? `<rect x="-24" y="-20" width="${W + 48}" height="164" fill="${C.sea}"/>` : '') +
    markA(dark ? C.sea8 : C.coral1, dark ? C.coral5 : C.coral) +
    `<path fill="${dark ? C.sand : C.sea}" d="${t1.d}"/><path fill="${dark ? C.coral4 : C.coral}" d="${t2.d}"/>`;
  return svg([-24, -20, W + 48, 164], 'Marjan Travel & Tours, direction A: Coral' + (dark ? ' (reversed)' : ''), body);
}
write('05-A-coral.svg', dirA(false));
write('06-A-coral-reversed.svg', dirA(true));
write('07-A-coral-icon.svg', svg([0, 0, 512, 512], 'Marjan icon, direction A', tile(C.coral, `<g transform="translate(64 58) scale(3.2)">${coralBranch(C.sand)}</g>`)));

// ---------- B · Route (the journey from your door to the destination) ----------
const pinPath = (cx, cy, r, tip) => `M${cx} ${tip}C${cx} ${tip} ${cx - r} ${cy + r * 0.78} ${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}C${cx + r} ${cy + r * 0.78} ${cx} ${tip} ${cx} ${tip}Z` +
  `M${cx + r * 0.36} ${cy}A${r * 0.36} ${r * 0.36} 0 1 0 ${cx - r * 0.36} ${cy}A${r * 0.36} ${r * 0.36} 0 1 0 ${cx + r * 0.36} ${cy}Z`;
const markB = (line, accent) => `<path d="M18.4 92.6L36 34L60 76L84 34L99 72" fill="none" stroke="${line}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<circle cx="16" cy="100" r="7" fill="none" stroke="${accent}" stroke-width="5"/><path fill="${accent}" fill-rule="evenodd" d="${pinPath(102, 74, 17, 103)}"/>`;
function dirB(dark) {
  const t1 = text(pjs800, 'marjan', 138, 78, 70, { tracking: -0.035 });
  // find the j dot: topmost contour of the 4th glyph
  const jg = pjs800.charToGlyph('j'), jp = jg.getPath(t1.xs[3], 78, 70), sub = []; let cur = [];
  for (const c of jp.commands) { if (c.type === 'M' && cur.length) { sub.push(cur); cur = []; } cur.push(c); } if (cur.length) sub.push(cur);
  const bb = sub.map(cmds => { const ys = cmds.filter(c => 'y' in c).map(c => c.y), xs = cmds.filter(c => 'x' in c).map(c => c.x); return { minY: Math.min(...ys), maxY: Math.max(...ys), minX: Math.min(...xs), maxX: Math.max(...xs) }; }).sort((a, b) => a.minY - b.minY)[0];
  const dot = { cx: (bb.minX + bb.maxX) / 2, cy: (bb.minY + bb.maxY) / 2, r: Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY) / 2 + 1.2 };
  const t2 = text(pjs600, 'travel & tours', 141, 106, 15, { tracking: 0.26 });
  const W = 138 + Math.max(t1.w, t2.w + 3);
  const fg = dark ? C.sand : C.sea, accent = dark ? C.coral5 : C.coral;
  const body = (dark ? `<rect x="-24" y="-20" width="${W + 48}" height="164" fill="${C.sea}"/>` : '') + markB(fg, accent) +
    `<path fill="${fg}" d="${t1.d}"/><circle cx="${dot.cx.toFixed(2)}" cy="${dot.cy.toFixed(2)}" r="${dot.r.toFixed(2)}" fill="${accent}"/><path fill="${dark ? C.sand2 : C.sea7}" d="${t2.d}"/>`;
  return svg([-24, -20, W + 48, 164], 'Marjan Travel & Tours, direction B: Route' + (dark ? ' (reversed)' : ''), body);
}
write('08-B-route.svg', dirB(false));
write('09-B-route-reversed.svg', dirB(true));
write('10-B-route-icon.svg', svg([0, 0, 512, 512], 'Marjan icon, direction B', tile(C.sea, `<g transform="translate(57 62) scale(3.3)">${markB(C.sand, C.coral5)}</g>`)));

// ---------- C · Gateway (arch: Umrah, heritage, mountains, sea) ----------
const ARCH = 'M0 130V60C0 31 21 16 38 9C44 6.5 48 3.5 50 0C52 3.5 56 6.5 62 9C79 16 100 31 100 60V130Z';
const markC = (id, sky, ring) => `<path fill="${sky}" d="${ARCH}"/><circle cx="50" cy="74" r="19" fill="${C.coral5}"/>
<path fill="${C.sea7}" d="M0 130V104L20 86L32 96L50 76L68 98L80 90L100 106V130Z"/>
<path fill="${C.sea95}" d="M0 114C10 111 18 111 26 114C34 117 42 117 50 114C58 111 66 111 74 114C82 117 90 117 100 114V130H0Z"/>
<path fill="none" stroke="${C.sand}" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round" d="M12 122C17 120 22 120 27 122M44 124C49 122 54 122 59 124M74 121C79 119 84 119 89 121"/>
<path d="${ARCH}" fill="none" stroke="${ring}" stroke-width="5" stroke-linejoin="round"/>`;
function dirC(dark) {
  const t1 = text(fraunces600, 'MARJAN', 0, 192, 44, { tracking: 0.14, anchor: 'middle' });
  const t2 = text(pjs700, 'TRAVEL & TOURS', 0, 216, 11, { tracking: 0.5, anchor: 'middle' });
  const W = Math.max(t1.w, t2.w + 70) + 40, x0 = -W / 2;
  const rule = (x1, x2) => `<path d="M${x1} 212.2H${x2}" stroke="${dark ? C.coral4 : C.coral}" stroke-width="1.4"/>`;
  const body = (dark ? `<rect x="${x0}" y="-24" width="${W}" height="268" fill="${C.sea}"/>` : '') +
    `<g transform="translate(-50 0)">${markC('arch' + (dark ? 'd' : 'l'), dark ? C.sea8 : C.sea, dark ? C.coral5 : C.coral)}</g>` +
    `<path fill="${dark ? C.sand : C.sea}" d="${t1.d}"/><path fill="${dark ? C.coral4 : C.coral}" d="${t2.d}"/>` +
    rule(-t2.w / 2 - 34, -t2.w / 2 - 12) + rule(t2.w / 2 + 12, t2.w / 2 + 34);
  return svg([x0, -24, W, 268], 'Marjan Travel & Tours, direction C: Gateway' + (dark ? ' (reversed)' : ''), body);
}
write('11-C-gateway.svg', dirC(false));
write('12-C-gateway-reversed.svg', dirC(true));
write('13-C-gateway-icon.svg', svg([0, 0, 512, 512], 'Marjan icon, direction C', tile(C.sand1, `<g transform="translate(116 74) scale(2.8)">${markC('archi', C.sea, C.coral)}</g>`)));

// ---------- D · Seal (passport stamp, the tagline travels with the logo) ----------
function markD(fg, disc, sep) {
  const top = arcText(pjs700, 'MARJAN TRAVEL & TOURS', 70, 70, 57, 270, 142, { tracking: 0.14 });
  const bot = arcText(pjs700, 'DREAM IT · BOOK IT · LIVE IT', 70, 70, 57, 90, 142, { tracking: 0.1, bottom: true });
  const M = text(fraunces600, 'M', 70, 88.5, 52, { anchor: 'middle' });
  return `<circle cx="70" cy="70" r="67" fill="none" stroke="${fg}" stroke-width="3"/><circle cx="70" cy="70" r="46.5" fill="none" stroke="${fg}" stroke-width="1.5"/>` +
    `<path fill="${fg}" d="${top.d}"/><path fill="${fg}" d="${bot.d}"/><circle cx="13" cy="70" r="2.6" fill="${sep}"/><circle cx="127" cy="70" r="2.6" fill="${sep}"/>` +
    `<circle cx="70" cy="70" r="39" fill="${disc}"/><path fill="${C.sand}" d="${M.d}"/>`;
}
function dirD(dark) {
  const t1 = text(fraunces600, 'Marjan', 164, 80, 66, { tracking: -0.01 });
  const t2 = text(fraunces400i, 'Travel & Tours', 166, 112, 27);
  const W = 164 + Math.max(t1.w, t2.w + 2);
  const fg = dark ? C.sand : C.sea, accent = dark ? C.coral5 : C.coral;
  const body = (dark ? `<rect x="-24" y="-24" width="${W + 48}" height="188" fill="${C.sea}"/>` : '') + markD(fg, accent, accent) +
    `<path fill="${fg}" d="${t1.d}"/><path fill="${dark ? C.coral4 : C.coral}" d="${t2.d}"/>`;
  return svg([-24, -24, W + 48, 188], 'Marjan Travel & Tours, direction D: Seal' + (dark ? ' (reversed)' : ''), body);
}
write('14-D-seal.svg', dirD(false));
write('15-D-seal-reversed.svg', dirD(true));
write('16-D-seal-icon.svg', svg([0, 0, 512, 512], 'Marjan icon, direction D', tile(C.sand, `<g transform="translate(46 46) scale(3.0)">${markD(C.sea, C.coral, C.coral)}</g>`)));
