// Traces the client logo bitmap into vector layers (navy, blue gradient, pill blue...)
const Jimp = require('jimp');
const potrace = require('potrace');
const fs = require('fs');
const SCALE = 4;

const inS = (x, y) => {
  if (x >= 828 && x <= 945 && y >= 488 && y <= 612) return false;
  return (x >= 515 && x <= 1160 && y >= 60 && y <= 520) || (x >= 580 && x <= 830 && y > 520 && y <= 578);
};
const inSmallPin = (x, y) => x >= 828 && x <= 945 && y >= 488 && y <= 612;

function trace(img, opts) {
  return new Promise((res, rej) => {
    const t = new potrace.Potrace({ threshold: 128, turdSize: 60, optTolerance: 0.7, alphaMax: 1.0, ...opts });
    t.loadImage(img, err => {
      if (err) return rej(err);
      const tag = t.getPathTag();
      const m = tag.match(/ d="([^"]*)"/);
      res(m ? m[1].trim() : '');
    });
  });
}

function fit(samples) { // least squares v = a + b*x + c*y
  let n = 0, sx = 0, sy = 0, sv = 0, sxx = 0, syy = 0, sxy = 0, sxv = 0, syv = 0;
  for (const [x, y, v] of samples) { n++; sx += x; sy += y; sv += v; sxx += x*x; syy += y*y; sxy += x*y; sxv += x*v; syv += y*v; }
  const A = [[n, sx, sy], [sx, sxx, sxy], [sy, sxy, syy]], B = [sv, sxv, syv];
  const det = m => m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  const D = det(A); const col = (i) => A.map((r, j) => r.map((v, k) => k === i ? B[j] : v));
  return [det(col(0))/D, det(col(1))/D, det(col(2))/D];
}

async function run(file, outBase) {
  const img = await Jimp.read(file);
  const { width: W, height: H, data } = img.bitmap;
  const layers = { navySym: [], navyRest: [], union: [], smallPin: [], bottomBlue: [], tagLines: [] };
  for (const k in layers) layers[k] = new Uint8Array(W * H); // coverage 0..255
  const acc = { navyText: [0,0,0,0], smallPin: [0,0,0,0], pill: [0,0,0,0], lines: [0,0,0,0] };
  const symBlue = [], symNavy = [];
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, r = data[i], g = data[i+1], b = data[i+2];
    let k = Math.min(1, Math.max(0, (255 - Math.min(r, g, b) * 0.6 - r * 0.4) / 255));
    if (k < 0.1) continue;
    if (k > 0.5) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    const bInk = (b - 255 * (1 - k)) / k, gInk = (g - 255 * (1 - k)) / k;
    const cov = Math.round(k * 255), p = y * W + x;
    const S = inS(x, y);
    if (S) {
      const navy = bInk < 165;
      layers.union[p] = cov;
      if (navy && x < 955) { layers.navySym[p] = cov; if (k > 0.95) symNavy.push([x, y, g, b]); }
      if (navy && x >= 955) layers.navyRest[p] = cov;
      if (!navy && k > 0.95) symBlue.push([x, y, g, b]);
    } else if (inSmallPin(x, y)) {
      layers.smallPin[p] = cov; if (k > 0.97) { const a = acc.smallPin; a[0] += r; a[1] += g; a[2] += b; a[3]++; }
    } else if (y >= 790 && (y <= 918 || x < 440 || x > 1100)) {
      if (y > 918) layers.tagLines[p] = cov; else layers.bottomBlue[p] = cov;
      const a = (y >= 812 && y <= 905 && x > 380 && x < 1150) ? acc.pill : acc.lines;
      if (k > 0.9) { a[0] += r; a[1] += g; a[2] += b; a[3]++; }
    } else {
      layers.navyRest[p] = cov;
      if (k > 0.97) { const a = acc.navyText; a[0] += r; a[1] += g; a[2] += b; a[3]++; }
    }
  }
  const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mean = a => a[3] ? hex(a[0]/a[3], a[1]/a[3], a[2]/a[3]) : null;
  const colors = { navyText: mean(acc.navyText), smallPin: mean(acc.smallPin), pill: mean(acc.pill), lines: mean(acc.lines) };

  // gradient fits (green + blue channel; red ~0)
  function gradient(samples) {
    const fg = fit(samples.map(s => [s[0], s[1], s[2]])), fb = fit(samples.map(s => [s[0], s[1], s[3]]));
    const len = Math.hypot(fg[1], fg[2]); const ux = fg[1] / len, uy = fg[2] / len;
    let lo = Infinity, hi = -Infinity;
    for (const s of samples) { const t = s[0]*ux + s[1]*uy; if (t < lo) lo = t; if (t > hi) hi = t; }
    const cx = samples.reduce((a, s) => a + s[0], 0) / samples.length, cy = samples.reduce((a, s) => a + s[1], 0) / samples.length;
    const c0 = cx*ux + cy*uy;
    const P1 = [cx + (lo - c0)*ux, cy + (lo - c0)*uy], P2 = [cx + (hi - c0)*ux, cy + (hi - c0)*uy];
    const col = P => hex(0, fg[0] + fg[1]*P[0] + fg[2]*P[1], fb[0] + fb[1]*P[0] + fb[2]*P[1]);
    return { x1: P1[0]*SCALE, y1: P1[1]*SCALE, x2: P2[0]*SCALE, y2: P2[1]*SCALE, c1: col(P1), c2: col(P2) };
  }
  const grads = { blue: gradient(symBlue), navy: gradient(symNavy) };

  const paths = {};
  for (const [name, cov] of Object.entries(layers)) {
    if (!cov.some(v => v)) { paths[name] = ''; continue; }
    const li = new Jimp(W, H, 0xffffffff);
    const d = li.bitmap.data;
    for (let p = 0; p < W * H; p++) { const v = 255 - cov[p]; d[p*4] = d[p*4+1] = d[p*4+2] = v; d[p*4+3] = 255; }
    li.resize(W * SCALE, H * SCALE, Jimp.RESIZE_BICUBIC);
    paths[name] = await trace(li, {});
  }
  const pad = 30;
  const vb = [(minX - pad) * SCALE, (minY - pad) * SCALE, (maxX - minX + 2*pad) * SCALE, (maxY - minY + 2*pad) * SCALE];
  const out = { file, vb, colors, grads, paths };
  fs.writeFileSync(outBase + '.json', JSON.stringify(out));
  console.log(outBase, 'vb', vb.join(' '), JSON.stringify(colors), JSON.stringify(grads), Object.fromEntries(Object.entries(paths).map(([k, v]) => [k, v.length])));
}
(async () => {
  await run(__dirname + '/../reference/' + 'client-logo-tagline.jpg', 'trace-tagline');
  await run(__dirname + '/../reference/' + 'client-logo-lines.jpg', 'trace-lines');
})().catch(e => { console.error(e); process.exit(1); });
