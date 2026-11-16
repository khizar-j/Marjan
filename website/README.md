# Marjan Travel & Tours: website

A static site with no dependencies. The copy comes from `../Website-Content/*.docx`. The design draws on the Mobbin reference collection ("Marjan Travel – Website Inspiration").

## Build and preview

```bash
node build.mjs
```

The build renders `src/pages/**/*.html` into `dist/` and copies `src/assets`, `robots.txt` and `llms.txt`.

Preview: the `.claude/launch.json` config `marjan-site` serves `website/dist` at http://localhost:4321. You can also run any static server on `dist/`.

## Home page

The home page is `src/pages/index.html`. It uses Plus Jakarta Sans throughout, with no eyebrows above the section titles. Its sections, top to bottom:

- **Hero:** five journeys with a quote planner. No kicker, cards or photo caption; the active tab shows only the 10% background fill.
- **Trust strip:** licence, MoRA, years, travellers and Google rating.
- **Introduction:** the entity statement, with the logo mark in a spinning seal (900px and wider).
- **Services:** a numbered index list with a large photo; 10 s auto-advance with a progress line.
- **Why choose us:** six reasons around an arch-shaped photo (photo first on phones).
- **Umrah packages:** featured package cards.
- **Destinations:** pick a place from the list (square thumbnails, soft selected card) and the large 16:9 photo changes; fits one screen.
- **How it works:** a travel route with no step numbers; a plane follows your scroll; the three descriptions are the same length.
- **Numbers:** small title on top, figures below, no lines.
- **Reviews:** a sample review carousel (arrows, swipe, dots), no photos or rating line; cards fade out at both edges.
- **Get a quote:** an enquiry form above the FAQ; it sends the details on WhatsApp.
- **FAQ** and a **closing call to action**.

The header (with the services mega menu) and the footer are shared partials. Future variations should start from a copy of this page.

## Structure

| Path | What it is |
| --- | --- |
| `build.mjs` | Build script with the shortcodes and the sample values for placeholders |
| `src/partials/` | `head`, `sprite` (SVG icons), `header`, `footer` |
| `src/pages/index.html` | Home page; the other pages go in `src/pages/<url>/index.html` |
| `src/assets/css/styles.css` | Design system and all section styles |
| `src/assets/js/main.js` | Hero and planner, menus, tabs, reveals, counters, WhatsApp links |
| `src/assets/img/` | Logo files and site icons |

Shortcodes:
- `{{> partial}}`
- `{{icon name}}`
- `{{ph KEY}}`: a yellow placeholder
- `{{img id="…" alt="…" ratio="4/5" widths="400,800" sizes="…" [eager]}}`

## Before launch

1. **Fill every placeholder.** Each `{{ph …}}` in the source and each `[BRACKETED]` value (phone, WhatsApp number in `head.html` `data-whatsapp`, address, licence numbers, social URLs, prices) needs a real value. The build warns about any `{{…}}` it cannot resolve.
2. **Remove the design-preview switch.** Delete the `devpill` block at the end of `src/partials/footer.html` and the "sample-data switch" section at the end of `main.js`. You can also delete the `.devpill` CSS.
3. **Replace the photos.** The Unsplash images are temporary. Use the agency's own photos, exported as WebP under 150 KB, and either self-host them or keep the `img` helper and point it at your own CDN.
4. **Replace the sample reviews.** The seven reviews on the home page are written examples to show the carousel layout. They are marked in the HTML and on the page. Replace them with real Google reviews (name, city, service, month), and never publish invented ones. Do not add Review schema for them.
5. **Decide where quote requests go.** The "Get a Free Quote" form and the hero planner open WhatsApp with the details filled in. To receive form leads by email as well, connect a form service (for example Formspree or Netlify Forms) to `[data-quote-form]`.
6. **Logo: in place.** The client's own logo is now used across the site. The files in `src/assets/img/`:
   - `logo-horizontal.svg`: the header logo on a light background.
   - `logo-horizontal-on-dark.svg`: the header logo over the hero photo, and the logo in the mobile menu and footer.
   - `logo-stacked.svg`: the stacked logo, for places where a squarer logo fits better. Not used on the page yet.
   - `logo-mark.svg`: the pin mark on its own, used in the introduction seal.
   - `favicon.svg`: the browser tab icon.
   - `apple-touch-icon.png` (180 × 180): the home-screen icon on iPhone and iPad.
   - `icon-512.png` (512 × 512): a large icon, for a web app manifest or a social profile. Not linked from the page yet.
   - `logo.png`: the stacked logo on white, used as the `logo` in the JSON-LD.
7. **Check the JSON-LD** in `index.html` once the placeholders are filled. The FAQPage answers must match the visible FAQ.

## Design notes

- Palette: from the client logo. Navy `#011249`, royal blue `#0254C0` and sky `#03A6F7`, on cool neutral backgrounds.
- Hero: five journeys (Umrah, Pakistan tours, holidays abroad, visas, corporate).
  - Each journey shows for 6 s. The active tab fills left to right with a 10% brand-blue fill, then the hero moves on.
  - Clicking a tab switches to it and restarts its timer.
  - Autoplay stops once the visitor starts using the form. A pause button meets WCAG 2.2.2.
  - It supports swipe on mobile and pointer parallax on desktop.
  - The planner sits 40px above the bottom of the hero on desktop.
  - The planner opens WhatsApp with a prefilled quote request.
- Phones: the hero is one screen tall minus the trust strip (`main.js` measures the strip into `--trust-h`), so the quote button and the licence and Umrah credentials are visible without scrolling. On shorter screens it tightens, then drops the lead line (under 730px tall) and the two hero buttons (under 620px). The trust strip becomes a two-row grid.
- Mega menu: five services with one-line titles and an Umrah feature card; no "All services" link.
- FAQ: one answer open at a time (`<details name="faq">` plus a small fallback script).
- Breakpoints: mobile first; 640 tablet, 1024 desktop, plus a short-screen rule (≥1024 wide, ≤880 tall) that keeps the planner above the fold on 1366×768 laptops.
- Smooth scrolling: `main.js` eases mouse-wheel and trackpad scrolling the way Lenis does (the library behind the Framer smooth-scroll component). Each wheel turn restarts a 1.5 s ease-out-expo glide from where the page is to the new target. Same-page links such as `#get-a-quote` glide to their target, below the fixed header. Touch, keyboard, the scrollbar and sideways carousel scrolling stay native. Because `main.js` loads on every page, every page gets it. Change the feel with `DURATION` (longer = floatier; Lenis's default is 1.2). The page's own wheel handling skips the phone menu, textareas and any box marked `data-native-scroll`.
- Header: moves with the page, like Twitter's top bar. Past 600 px, scrolling down pushes it up out of view pixel for pixel, and scrolling up pulls it back. It never flips between two states, so fast up-and-down scrolling can't make it jump. When scrolling stops with the bar half shown, it waits 180 ms (`SETTLE_DELAY`), then eases the rest of the way in the direction you were going. It stays put while the menu is open or something in it has keyboard focus.
- Dropdowns: every `<select>` gets a custom list (`main.js`, "Custom dropdowns"). The real select stays hidden underneath, so the form still submits it, required checks still run and the hero can still rebuild its options. The list supports the keyboard (arrows, Home/End, Enter, Escape, typing a letter), opens upward when there is no room below, and scrolls on its own when it is long. A required select left empty turns red and shows its `data-error` text (default "Please choose an option.").
- Get a quote on phones: the contact list, the promise line and the note under the button are hidden, and the fields sit two to a row, so the whole form fits on one screen above the bottom bar (checked from 360 × 640 to 412 × 915). The message box is three lines tall, so its two-line hint shows without a scroll bar. Screens 760 px tall or less also drop the intro line.
- Hero planner: the focused or open field gets a rounded blue ring 4 px inside it. Its corners follow the curve of the white box around the fields (`--pf-r` minus 4 px), so change `--pf-r`, not `border-radius`, on `.planner__form`.
- Numbers: the two one-line figures (years, Google rating) come first, so on phones each row's labels have the same number of lines. The figure sits at the top of each cell, so a row stays level even if a label wraps.
- FAQ: the "Ask on WhatsApp" box shows only on desktop (1024 px and up); smaller screens have WhatsApp in the bottom bar.
- Reviews on phones: the two arrows sit under the cards, either side of the dots.
- Shadows: everything uses the review card's soft shadow. `--shadow-1` is for cards, photos and panels; `--shadow-2` is the slightly lifted version for card hover; `--shadow-pop` adds a hairline edge for menus and pop-ups; `--shadow-blue` is the soft glow under blue buttons. Use these tokens instead of new shadows.
- `prefers-reduced-motion` keeps the fades but drops zoom, slide and parallax effects. Same-page links then jump instead of gliding. Wheel smoothing and the header's slide stay on.
