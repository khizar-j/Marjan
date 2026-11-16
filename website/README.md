# Marjan Travel & Tours: website

A static site with no dependencies. The copy comes from `../Website-Content/*.docx`. The design draws on the Mobbin reference collection ("Marjan Travel – Website Inspiration").

## Build and preview

```bash
node build.mjs
```

The build renders `src/pages/**/*.html` into `dist/` and copies `src/assets`, `robots.txt` and `llms.txt`.

Preview: the `.claude/launch.json` config `marjan-site` serves `website/dist` at http://localhost:4321. You can also run any static server on `dist/`.

## Two home-page versions (for comparison)

| | Version 1: `/` | Version 2: `/v2/` |
| --- | --- | --- |
| Files | `src/pages/index.html`, `styles.css`, `main.js`, `partials/head.html` | `src/pages/v2/index.html`, `styles-v2.css`, `main-v2.js`, `partials/head-v2.html` |
| Type | Fraunces serif headings, Plus Jakarta Sans text | Plus Jakarta Sans throughout |
| Hero | Kicker, floating cards, photo caption | No kicker, cards or caption; the active tab shows only the 10% background fill |
| Eyebrows | Above every section title | None |
| Services | Expanding image panels | Numbered index list with a large photo; 10 s auto-advance with a progress line |
| Why choose us | Feature list | Six reasons around an arch-shaped photo (photo first on phones) |
| Destinations | Bento cards | Showcase: pick a place from the list (square thumbnails, soft selected card) and the large 16:9 photo changes; fits one screen |
| How it works | Three steps with a progress line | Travel route, no step numbers; a plane follows your scroll; the three descriptions are the same length |
| Numbers | Title beside the figures, decorative lines | Small title on top, figures below, no lines |
| Reviews | Placeholder cards | Sample review carousel (arrows, swipe, dots), no photos or rating line; cards fade out at both edges |
| Get a quote | — | Enquiry form above the FAQ; sends the details on WhatsApp |

The `V1 | V2` switch in the devpill moves between them. Version 2 has `noindex`. Shared by both: the header (with the services mega menu), the footer, the planner 40px from the bottom of the hero on desktop, and on phones the hero plus the trust strip filling exactly one screen.

When a version is chosen, delete the other one's files and the `devpill__versions` links in `footer.html`. If v2 wins, move it to `src/pages/index.html` and drop its `noindex`.

## Structure

| Path | What it is |
| --- | --- |
| `build.mjs` | Build script with the shortcodes and the sample values for placeholders |
| `src/partials/` | `head` / `head-v2`, `sprite` (SVG icons), `header`, `footer` |
| `src/pages/index.html` | Home page; the other pages go in `src/pages/<url>/index.html` |
| `src/assets/css/styles.css` | Design system and all section styles (v2 has its own copy) |
| `src/assets/js/main.js` | Hero and planner, menus, tabs, reveals, counters, WhatsApp links (v2 has its own copy) |

Shortcodes:
- `{{> partial}}`
- `{{icon name}}`
- `{{ph KEY}}`: a yellow placeholder
- `{{img id="…" alt="…" ratio="4/5" widths="400,800" sizes="…" [eager]}}`

## Before launch

1. **Fill every placeholder.** Each `{{ph …}}` in the source and each `[BRACKETED]` value (phone, WhatsApp number in `head.html` `data-whatsapp`, address, licence numbers, social URLs, prices) needs a real value. The build warns about any `{{…}}` it cannot resolve.
2. **Remove the design-preview switch.** Delete the `devpill` block at the end of `src/partials/footer.html` and the "Sample data" section at the end of `main.js`. You can also delete the `.devpill` CSS.
3. **Replace the photos.** The Unsplash images are temporary. Use the agency's own photos, exported as WebP under 150 KB, and either self-host them or keep the `img` helper and point it at your own CDN.
4. **Replace the sample reviews.** The seven reviews in v2 are written examples to show the carousel layout. They are marked in the HTML and on the page. Replace them with real Google reviews (name, city, service, month), and never publish invented ones. Do not add Review schema for them. Version 1 shows placeholder tokens only.
5. **Decide where quote requests go.** The v2 "Get a Free Quote" form and the hero planner open WhatsApp with the details filled in. To receive form leads by email as well, connect a form service (for example Formspree or Netlify Forms) to `[data-quote-form]`.
6. **Swap in the logo.** The coral mark and wordmark are stand-ins for the real logo.
7. **Check the JSON-LD** in `index.html` once the placeholders are filled. The FAQPage answers must match the visible FAQ.

## Design notes

- Palette: coral `#C9401F` ("Marjan" means coral), deep sea `#0B2429`, sand `#FDFAF5`.
- Hero: five journeys (Umrah, Pakistan tours, holidays abroad, visas, corporate).
  - Each journey shows for 6 s. The active tab fills left to right with 10% coral, then the hero moves on.
  - Clicking a tab switches to it and restarts its timer.
  - Autoplay stops once the visitor starts using the form. A pause button meets WCAG 2.2.2.
  - It supports swipe on mobile and pointer parallax on desktop.
  - The planner sits 40px above the bottom of the hero on desktop.
  - The planner opens WhatsApp with a prefilled quote request.
- Phones: the hero is one screen tall minus the trust strip (`main.js` measures the strip into `--trust-h`), so the quote button and the licence and Umrah credentials are visible without scrolling. On shorter screens it tightens, then drops the photo caption (under 780px tall), the lead line (under 730px) and the two hero buttons (under 620px). The trust strip becomes a two-row grid.
- Mega menu: five services with one-line titles and an Umrah feature card; no "All services" link.
- FAQ: one answer open at a time (`<details name="faq">` plus a small fallback script).
- Breakpoints: mobile first; 640 tablet, 1024 desktop, plus a short-screen rule (≥1024 wide, ≤880 tall) that keeps the planner above the fold on 1366×768 laptops.
- `prefers-reduced-motion` keeps the fades but drops zoom, slide and parallax effects.
