// Marjan: serve the design preview under /design-branch and keep the rest of
// marjantravels.com on a "Coming soon" page until launch.
//
// The site's links are root-relative (href="/contact-us/"), so HTML responses
// get those links rewritten to /design-branch/... on the way out.
// At launch: delete this file, remove "main" and "run_worker_first" from
// wrangler.jsonc, and the site will be served from the root again.

const PREFIX = '/design-branch';

const COMING_SOON = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Marjan Travel &amp; Tours</title>
<style>
  html,body{height:100%;margin:0}
  body{display:grid;place-items:center;background:#FDFAF5;color:#0B2429;
       font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;padding:16px}
  h1{color:#C9401F;font-size:clamp(28px,6vw,44px);margin:0 0 8px}
  p{margin:0;opacity:.75}
</style></head>
<body><main><h1>Marjan Travel &amp; Tours</h1><p>Our new website is coming soon.</p></main></body></html>`;

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
    if (url.pathname === PREFIX) {
      return Response.redirect(`${url.origin}${PREFIX}/${url.search}`, 301);
    }
    if (!url.pathname.startsWith(PREFIX + '/')) {
      return new Response(COMING_SOON, {
        headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' },
      });
    }

    const inner = new URL(url);
    inner.pathname = url.pathname.slice(PREFIX.length);
    const upstream = await env.ASSETS.fetch(new Request(inner, request));

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
