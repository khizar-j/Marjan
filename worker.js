// Marjan: serve the design preview under /design-branch and keep the rest of
// marjantravels.com on a branded "Coming soon" page until launch.
//
// The site's links are root-relative (href="/contact-us/"), so HTML responses
// get those links rewritten to /design-branch/... on the way out.
// Preview pages that don't exist yet (About, Contact, Services...) show the
// same Coming soon page with a small link back to the preview home page.
// At launch: delete this file, remove "main" and "run_worker_first" from
// wrangler.jsonc, and the site will be served from the root again.

const PREFIX = '/design-branch';
const LOGO_PATH = '/_brand/marjan-logo.svg';
const LOGO_ASSET = '/assets/brand/marjan-logo.svg';
const ICON_PATH = '/_brand/marjan-icon.svg';               // favicon: main icon only
const ICON_ASSET = '/assets/brand/marjan-icon.svg';
const LOGO_ANIMATED_PATH = '/_brand/marjan-logo-animated.svg';
const LOGO_ANIMATED_ASSET = '/assets/brand/marjan-logo-animated.svg';

// Brand colours taken from the client logo (logo/svg/02-client-logo-lines.svg).
// The logo animation lives inside marjan-logo-animated.svg (pure CSS, loops).
const comingSoonPage = ({ link } = {}) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#ffffff">
<title>Marjan Travel &amp; Tours | Coming soon</title>
<link rel="icon" href="${ICON_PATH}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  html,body{height:100%;margin:0}
  body{
    min-height:100svh; display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:24px 16px; text-align:center; background:#fff; color:#011249;
    font-family:Poppins, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .logo{width:min(420px, 80vw); height:auto; display:block}
  h1{
    margin:clamp(24px, 5vh, 44px) 0 0; font-weight:500; font-size:clamp(13px, 2.4vw, 16px);
    letter-spacing:.42em; text-indent:.42em; text-transform:uppercase; color:#011249;
    animation:in 1s .6s cubic-bezier(.2,.7,.2,1) both;
  }
  .link{margin-top:20px; font-size:14px; color:#0359C6; text-decoration:none; font-weight:600}
  .link:hover,.link:focus-visible{text-decoration:underline}
  @keyframes in{from{opacity:0; transform:translateY(8px)}to{opacity:1; transform:none}}
  @media (prefers-reduced-motion:reduce){h1{animation:none}}
</style></head>
<body>
  <img class="logo" src="${LOGO_ANIMATED_PATH}" alt="Marjan Travel &amp; Tours" width="420" height="358">
  <h1>Coming soon</h1>
  ${link ? `<a class="link" href="${link.href}">${link.label}</a>` : ''}
</body></html>`;

const HOME_PAGE = () => comingSoonPage();
const MISSING_PAGE = () => comingSoonPage({ link: { href: `${PREFIX}/`, label: '← Back to home' } });

const html = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex', 'cache-control': 'no-cache' },
  });

const prefixPath = (v) => (v && v.startsWith('/') && !v.startsWith('//') ? PREFIX + v : v);

// srcset-style lists ("/a.webp 640w, /b.webp 1024w"): prefix every candidate URL that is root-relative.
const prefixSrcset = (v) => (v ? v.replace(/(^|,)(\s*)\/(?!\/)/g, `$1$2${PREFIX}/`) : v);

const rewriteAttr = (attr, prefix = prefixPath) => ({
  element(el) {
    const v = el.getAttribute(attr);
    const nv = prefix(v);
    if (nv !== v) el.setAttribute(attr, nv);
  },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/robots.txt') {
      return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain' } });
    }
    const brand = {
      [LOGO_PATH]: LOGO_ASSET,
      [LOGO_ANIMATED_PATH]: LOGO_ANIMATED_ASSET,
      [ICON_PATH]: ICON_ASSET,
      '/favicon.ico': ICON_ASSET,
    }[url.pathname];
    if (brand) {
      const logo = new URL(url);
      logo.pathname = brand;
      return env.ASSETS.fetch(new Request(logo, request));
    }
    if (url.pathname === PREFIX) {
      return Response.redirect(`${url.origin}${PREFIX}/${url.search}`, 301);
    }
    if (!url.pathname.startsWith(PREFIX + '/')) {
      return html(HOME_PAGE());
    }

    const inner = new URL(url);
    inner.pathname = url.pathname.slice(PREFIX.length);
    const upstream = await env.ASSETS.fetch(new Request(inner, request));

    // A preview page that hasn't been built yet: show the branded Coming soon page.
    if (upstream.status === 404 && (request.headers.get('accept') || '').includes('text/html')) {
      return html(MISSING_PAGE(), 404);
    }

    const res = new Response(upstream.body, upstream);
    res.headers.set('x-robots-tag', 'noindex, nofollow');

    const loc = res.headers.get('location');
    if (loc) {
      const l = new URL(loc, inner);
      if (l.origin === url.origin && !l.pathname.startsWith(PREFIX + '/')) {
        l.pathname = PREFIX + l.pathname;
        res.headers.set('location', l.pathname + l.search);
      }
    }

    if ((res.headers.get('content-type') || '').includes('text/html')) {
      return new HTMLRewriter()
        .on('[href]', rewriteAttr('href'))
        .on('[src]', rewriteAttr('src'))
        .on('[data-src]', rewriteAttr('data-src'))
        .on('[action]', rewriteAttr('action'))
        .on('[poster]', rewriteAttr('poster'))
        // v2 hero: js/v2/10-hero.js builds the clip URLs from data-video (`${data-video}-m.mp4`)
        .on('[data-video]', rewriteAttr('data-video'))
        // the phone posters in the hero <picture> (<source srcset> / data-srcset until needed), preload imagesrcset
        .on('[srcset]', rewriteAttr('srcset', prefixSrcset))
        .on('[data-srcset]', rewriteAttr('data-srcset', prefixSrcset))
        .on('[imagesrcset]', rewriteAttr('imagesrcset', prefixSrcset))
        .transform(res);
    }
    return res;
  },
};
