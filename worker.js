// Marjan: serve the design preview under /design-branch and keep the rest of
// marjantravels.com on a branded "Coming soon" page until launch.
//
// The site's links are root-relative (href="/contact-us/"), so HTML responses
// get those links rewritten to /design-branch/... on the way out.
// Preview pages that don't exist yet (About, Contact, Services...) show the
// same Coming soon design with a link back to the preview home page.
// At launch: delete this file, remove "main" and "run_worker_first" from
// wrangler.jsonc, and the site will be served from the root again.

const PREFIX = '/design-branch';
const LOGO_PATH = '/_brand/marjan-logo.svg';
const LOGO_ASSET = '/assets/brand/marjan-logo.svg';

// Brand colours taken from the client logo (logo/svg/02-client-logo-lines.svg).
const comingSoonPage = ({ heading, text, link }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#011249">
<title>Marjan Travel &amp; Tours | Coming soon</title>
<link rel="icon" href="${LOGO_PATH}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,600;0,700;1,800&display=swap" rel="stylesheet">
<style>
  :root{
    --navy:#011249; --navy-2:#011E5A; --blue:#0359C6; --blue-2:#027DE0; --sky:#0194EE; --sky-2:#03A6F7;
    --ink:#011249; --muted:#4A5878; --bg:#FFFFFF; --bg-2:#EEF5FD;
  }
  *{box-sizing:border-box}
  html,body{height:100%;margin:0}
  body{
    min-height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:32px 16px; text-align:center; color:var(--ink);
    font:16px/1.6 Poppins, system-ui, -apple-system, "Segoe UI", sans-serif;
    background:
      radial-gradient(1200px 600px at 50% -10%, var(--bg-2), transparent 70%),
      radial-gradient(800px 400px at 50% 120%, #E3F0FD, transparent 70%),
      var(--bg);
    overflow-x:hidden;
  }
  main{width:100%; max-width:640px; display:flex; flex-direction:column; align-items:center}
  .logo{width:min(380px, 78vw); height:auto; display:block; margin:0 0 28px}
  .badge{
    display:inline-flex; align-items:center; gap:8px; margin:0 0 18px; padding:6px 16px;
    border-radius:999px; background:var(--blue); color:#fff;
    font-weight:600; font-size:13px; letter-spacing:.14em; text-transform:uppercase;
  }
  .badge::before{content:""; width:8px; height:8px; border-radius:50%; background:var(--sky-2);
    box-shadow:0 0 0 0 rgba(3,166,247,.7); animation:pulse 2s infinite}
  h1{margin:0 0 10px; font-weight:800; font-style:italic; letter-spacing:-.02em;
     font-size:clamp(30px, 6.5vw, 48px); line-height:1.1; color:var(--navy); text-wrap:balance}
  h1 span{background:linear-gradient(90deg, var(--blue), var(--sky)); -webkit-background-clip:text; background-clip:text; color:transparent}
  p{margin:0 auto; max-width:46ch; text-wrap:pretty; color:var(--muted); font-size:clamp(15px, 2.2vw, 17px)}
  .route{width:min(420px, 86vw); height:48px; margin:28px 0 0; overflow:visible}
  .route path{fill:none; stroke:var(--sky); stroke-width:2.5; stroke-linecap:round; stroke-dasharray:2 10}
  .route .plane{fill:var(--navy); offset-path:path("M8 40 C 120 40, 260 6, 412 10"); offset-rotate:auto;
    animation:fly 6s ease-in-out infinite}
  .link{display:inline-block; margin-top:26px; padding:12px 26px; border-radius:999px;
    background:var(--navy); color:#fff; text-decoration:none; font-weight:600}
  .link:hover,.link:focus-visible{background:var(--blue)}
  footer{margin-top:40px; font-size:13px; color:var(--muted)}
  @keyframes fly{0%{offset-distance:0%; opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{offset-distance:100%; opacity:0}}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(3,166,247,.7)} 70%{box-shadow:0 0 0 10px rgba(3,166,247,0)} 100%{box-shadow:0 0 0 0 rgba(3,166,247,0)}}
  @media (prefers-reduced-motion:reduce){.route .plane{animation:none; offset-distance:100%} .badge::before{animation:none}}
</style></head>
<body><main>
  <img class="logo" src="${LOGO_PATH}" alt="Marjan Travel &amp; Tours" width="380" height="313">
  <span class="badge">Coming soon</span>
  <h1>${heading}</h1>
  <p>${text}</p>
  <svg class="route" viewBox="0 0 420 48" aria-hidden="true">
    <path d="M8 40 C 120 40, 260 6, 412 10"/>
    <path class="plane" d="M-9 -2 L4 -2 L9 -7 L11 -7 L8 -2 L12 -2 L14 -4 L15 -4 L14 0 L15 4 L14 4 L12 2 L8 2 L11 7 L9 7 L4 2 L-9 2 Q-12 0 -9 -2 Z"/>
  </svg>
  ${link ? `<a class="link" href="${link.href}">${link.label}</a>` : ''}
</main>
<footer>&copy; Marjan Travel &amp; Tours</footer>
</body></html>`;

const HOME_PAGE = () => comingSoonPage({
  heading: 'Your next journey <span>starts here</span>',
  text: 'We’re putting the finishing touches on our new website for Umrah packages, visas and tours. Please check back soon.',
});

const MISSING_PAGE = () => comingSoonPage({
  heading: 'This page is <span>on its way</span>',
  text: 'We’re still building this part of the site. In the meantime, have a look at the home page.',
  link: { href: `${PREFIX}/`, label: 'Back to the home page' },
});

const html = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex', 'cache-control': 'no-cache' },
  });

const prefixPath = (v) => (v && v.startsWith('/') && !v.startsWith('//') ? PREFIX + v : v);

const rewriteAttr = (attr) => ({
  element(el) {
    const v = el.getAttribute(attr);
    const nv = prefixPath(v);
    if (nv !== v) el.setAttribute(attr, nv);
  },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/robots.txt') {
      return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain' } });
    }
    if (url.pathname === LOGO_PATH || url.pathname === '/favicon.ico') {
      const logo = new URL(url);
      logo.pathname = LOGO_ASSET;
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
        .transform(res);
    }
    return res;
  },
};
