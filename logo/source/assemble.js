// Builds SVG logo files from the traced layers, with a palette per colourway.
const fs = require('fs');
const OUT = __dirname + '/../svg/';
fs.mkdirSync(OUT, { recursive: true });
const round = d => d.replace(/-?\d+\.\d+/g, n => String(Math.round(parseFloat(n))));

const PALETTES = {
  original: {
    blueStops: [[0, '#0359C6'], [0.45, '#027DE0'], [0.85, '#0194EE'], [1, '#03A6F7']],
    navyStops: [[0, '#011249'], [0.55, '#01144C'], [0.8, '#011E5A'], [1, '#02377F']],
    text: '#011249', smallPin: '#0257C5', pill: '#0254C0', lines: '#0291DE',
  },
  coral: { // website palette: coral + deep sea
    blueStops: [[0, '#B5361A'], [0.45, '#D2482A'], [0.85, '#E8613D'], [1, '#F2825F']],
    navyStops: [[0, '#071A1E'], [0.55, '#0B2429'], [0.8, '#0F3036'], [1, '#174149']],
    text: '#0B2429', smallPin: '#C9401F', pill: '#C9401F', lines: '#E2603F',
  },
};

function build(trace, pal, title) {
  const t = JSON.parse(fs.readFileSync(trace));
  const g = t.grads;
  const stops = s => s.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  const grad = (id, gr, s) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${Math.round(gr.x1)}" y1="${Math.round(gr.y1)}" x2="${Math.round(gr.x2)}" y2="${Math.round(gr.y2)}">${stops(s)}</linearGradient>`;
  const p = (d, fill, id) => d ? `<path id="${id}" fill="${fill}" fill-rule="evenodd" d="${round(d)}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${t.vb.join(' ')}" role="img" aria-labelledby="t"><title id="t">${title.replace(/&/g, "&amp;")}</title>` +
    `<defs>${grad('pin-gradient', g.blue, pal.blueStops)}${grad('mountain-gradient', g.navy, pal.navyStops)}</defs>` +
    p(t.paths.union, 'url(#pin-gradient)', 'pin') +
    p(t.paths.navySym, 'url(#mountain-gradient)', 'mountains') +
    p(t.paths.navyRest, pal.text, 'wordmark-and-plane') +
    p(t.paths.smallPin, pal.smallPin, 'j-pin') +
    p(t.paths.bottomBlue, pal.pill, 'travel-tours-band') + p(t.paths.tagLines, pal.lines, 'tagline-lines') + `</svg>\n`;
}
const files = [
  ['trace-tagline.json', 'original', '01-client-logo-tagline.svg', 'Marjan Travel & Tours logo (with tagline)'],
  ['trace-lines.json', 'original', '02-client-logo-lines.svg', 'Marjan Travel & Tours logo'],
  ['trace-tagline.json', 'coral', '03-client-logo-coral-tagline.svg', 'Marjan Travel & Tours logo, website colours (with tagline)'],
  ['trace-lines.json', 'coral', '04-client-logo-coral-lines.svg', 'Marjan Travel & Tours logo, website colours'],
];
for (const [tr, pal, name, title] of files) {
  const svg = build(tr, PALETTES[pal], title);
  fs.writeFileSync(OUT + name, svg);
  console.log(name, (svg.length / 1024).toFixed(1) + ' KB');
}
