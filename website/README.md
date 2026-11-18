# Marjan Travel & Tours: website

A static site with no dependencies. The copy comes from `../Website-Content/*.docx`. The design draws on the Mobbin reference collection ("Marjan Travel – Website Inspiration").

## Build and preview

```bash
node build.mjs
```

The build renders `src/pages/**/*.html` into `dist/` and copies `src/assets`, `robots.txt` and `llms.txt`. Every stylesheet and script link gets `?v=` plus a short hash of the file, so after a change browsers load the new file instead of an old cached copy.

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
- **How it works:** a travel route with no step numbers; a plane follows your scroll; the three descriptions are the same length. On phones the line runs from the first stop to the last and no further (`main.js` writes the last step's height into `--tail`), and each stop lights up as the plane reaches it.
- **Numbers:** small title on top, figures below, no lines. The + and the star after a figure are icons (`i-stat-plus`, `i-stat-star` in the sprite, `.stat__suf`), not the font's characters: the same height (.46em), centred on the digits and the same gap after every figure. The font's own + sat low and its ★ was much bigger.
- **Reviews:** a sample review carousel (arrows, swipe, dots), no photos or rating line; cards fade out at both edges.
- **Get a quote:** an enquiry form above the FAQ; it sends the details on WhatsApp.
- **FAQ** and a **closing call to action**.

The header (with the services mega menu) and the footer are shared partials. Future variations should start from a copy of this page.

## Version 2 (design variant at `/v2/`)

Version 2 is a copy of the home page with background videos in the hero and a scroll effect in each section. It is `noindex`, so it never competes with `/`.
- **Page:** `src/pages/v2/index.html`. Each section is its own partial in `src/partials/v2/*.html`.
- **V1 | V2 tabs:** in the "Sample data" pill (the `devpill` in `src/partials/footer.html`), so you can switch at any point while scrolling. The blue thumb marks the version you are on and slides across before the other one opens. Desktop: the pill is always there, bottom right (under the hero planner on the first screen, above the WhatsApp button after). Phones and tablets: from the second screen on.
- **v2 header:** a white bar with rounded ends (`--r-lg`) floating 26 px below the top on tablets and desktop (10 px on phones), on every screen, white over the hero too, so nothing fades as the page starts to move. It still slides away as you scroll down and back as you scroll up. Styles in `css/v2/05-header.css`; `--bar: float` there tells `main.js`. From 640 px up, v2 sets `--header-h` to 90 px (14 px more than v1), so the bar keeps its 64 px height and the hero copy, the pinned services and same-page links start below it. On phones the menu button is round, 5 px inside the bar's end.
- **v2 on phones:** the trust strip is a ticker: one row, each credential with its icon on the left and its text on one line, gliding right to left in an endless loop at a steady 36 px a second (`js/v2/12-trust.js` adds a hidden copy of the items so the loop joins up; touching or hovering pauses it). It is one 46 px row, so hero + strip fill one screen with room to spare. In v2 the rating reads "4.9 Rating on Google" (no star). Services are separated by a grey line with 20 px more room on each side (no blue line). In the hero planner the last tab has 22 px of room after it, so when Corporate is selected it stays clear of the pinned pause button's fade.
- **v2-only styles and scripts:** `src/assets/css/v2/NN-*.css` and `src/assets/js/v2/NN-*.js`. The build joins each folder, in name order, into `/assets/css/v2.css` and `/assets/js/v2.js`. These load only on the v2 page, after `styles.css` and `main.js`.
- **Shared scroll helper:** `js/v2/00-core.js` (`window.MFX`). It uses one scroll listener for the page and measures elements only while they are near the screen. Effects animate only transform, opacity, clip-path and filter. Every section shows finished without JavaScript.
- **Hero videos:** the client's own 8-second clip for each journey, in `src/assets/video/hero-<key>-{1080,m}.mp4`, with WebP posters (the first frame). There is no location caption.
  - The clip sets the pace: each journey plays its clip once, and as it ends the next journey cuts in at its first frame, so the five clips run on like one film. The active tab fills in step with the clip.
  - While the slideshow is held (the visitor is using the form, the mouse is over the form, the pause button, the hero partly scrolled away), the current clip loops. A click, key press or swipe still crossfades to the chosen journey.
  - The poster shows at once (it is preloaded). Only the active video loads after the page has loaded; the next journey's poster is fetched straight away and its video once the current one is buffered.
  - Every screen except a phone held upright gets `-1080`: the client's own file as uploaded. Its video track is copied byte for byte (not re-encoded); only the silent audio track is left out and the file index moved to the front, so it starts playing before it has fully downloaded.
  - Phones held upright get `-m`, an upright 608 × 1080 cut that follows the subject of each 2-second shot. A crop can't be made without encoding, so it is made from the originals at their own pixel size and near-lossless quality (SSIM 0.994 against the original).
  - Videos pause off-screen and with the pause button. Save-Data connections get posters only, on the 8 s timer (`data-duration`).
  - Sizes per clip: 1.6–5.5 MB (`-1080`, as uploaded), 1.7–3.9 MB (`-m`).
- **Scrolling past the hero:** everything after the hero is one sheet (`<div class="sheet" data-sheet>` in the page) that rises over it. The hero stays put (`position: sticky`) and sinks back: a little lower, smaller and darker. Once the sheet is halfway up, the introduction on it comes in with the scroll. When the hero is fully covered its video pauses. Built to stay light on phones (a fast flick used to show the hero video in blank gaps, because the phone was too busy to draw the page in time): `js/v2/10-hero.js` writes the hero's translate and scale, the darkening layer's opacity (`.hero__dim`, added by the script) and the introduction's opacity and position as inline styles on just those elements (a CSS variable would restyle everything inside them on every frame). The hero is its own layer (`will-change: transform`) and so is the darkening, so nothing is repainted while you scroll; the corners round once (`.is-lifting`). Phones and tablets have no frosted blur on the planner or the WhatsApp button (it was redrawn for every video frame). Once the sheet's top is 40 px above the screen, `body.is-hero-gone` makes the hero see-through and the backdrop page-coloured.
- **Services (desktop):** scrolling through the pinned list pushes the photos like a vertical strip. The old photo goes up and out as the next one rises in from the bottom; scrolling back up reverses it. This also runs with reduced motion on, without the zoom. The photo frame has no backdrop of its own, so while a photo loads the section background shows (both versions).
- **Hooks in `main.js`:** `main.js` has optional hooks for v2: `data-duration` on the hero, `data-caption` on a slide, `data-no-parallax`, and `hero.journeyClock(run)`, which lets the background clip set the pace (it returns 0–1, or `null` for the timer). It also fires a `journey` event on every switch, with `auto: true` when the slideshow moved on by itself. The live page doesn't use them.

Video sources: the five hero clips (Umrah, Pakistan tours, holidays abroad, visas, corporate) are the client's own edits, 8 seconds each with a cut every 2 seconds. The originals are kept outside the repo (`Marjan Header Video/Header Video/01–05.mp4`).

To make v2 the home page later, merge its partials, styles and scripts into `/`. Don't keep two copies.

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
2. **Remove the design-preview switches.** Delete the `devpill` block at the end of `src/partials/footer.html` and the "sample-data switch" section at the end of `main.js`. You can also delete the `.devpill` CSS. The pill also holds the V1 | V2 tabs: delete the "V1 | V2 switch" section at the end of `main.js` and the `verswitch` line near the top too.
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
- Header: moves with the page, like Twitter's top bar. Past 600 px, scrolling down pushes it up out of view pixel for pixel, and scrolling up pulls it back. It never flips between two states, so fast up-and-down scrolling can't make it jump. When scrolling stops with the bar half shown, it waits 180 ms (`SETTLE_DELAY`), then eases the rest of the way in the direction you were going. It stays put while the menu is open or something in it has keyboard focus. Phones and tablets (version 1): the bar used to turn white as soon as the page moved but stay for the first 600 px, so a fast flick flashed a white bar; there it now scrolls away with the page from the very top, still see-through, and turns white only when it comes back (scrolling up) or once the hero is gone, switching at once (no fade).
- Services menu (desktop): opens on hover or click. A second click on Services, or Escape, closes it even while the pointer is still over it (`.is-shut`); before, hover and the button's focus held it open.
- Dropdowns: every `<select>` gets a custom list (`main.js`, "Custom dropdowns"). The real select stays hidden underneath, so the form still submits it, required checks still run and the hero can still rebuild its options. The list supports the keyboard (arrows, Home/End, Enter, Escape, typing a letter), opens upward when there is no room below, and scrolls on its own when it is long. A required select left empty turns red and shows its `data-error` text (default "Please choose an option.").
- Get a quote on phones: the contact list, the promise line and the note under the button are hidden, and the fields sit two to a row, so the whole form fits on one screen above the bottom bar (checked from 360 × 640 to 412 × 915). The message box is three lines tall, so its two-line hint shows without a scroll bar. Screens 760 px tall or less also drop the intro line.
- Hero planner: the focused or open field gets a rounded blue ring 4 px inside it. Its corners follow the curve of the white box around the fields (`--pf-r` minus 4 px), so change `--pf-r`, not `border-radius`, on `.planner__form`.
- Numbers: the two one-line figures (years, Google rating) come first, so on phones each row's labels have the same number of lines. The figure sits at the top of each cell, so a row stays level even if a label wraps.
- FAQ: the "Ask on WhatsApp" box shows only on desktop (1024 px and up); smaller screens have the floating WhatsApp button.
- Phones and tablets: a bottom bar (`.actionbar` in `footer.html`) with two buttons, each with its icon beside the text: the phone number (tap to call) and Free Quote. WhatsApp is not in the bar: the round green button (`.wa-fab`) floats bottom right on every screen, above the bar on phones and in the corner on desktop (where hovering opens its label). Both appear once you scroll past the hero. The footer has extra room at the bottom so its last line clears them.
- Reviews on phones: the two arrows sit under the cards, either side of the dots.
- Phones and tablets: lazy photos start downloading when they are within three screens (main.js switches them to eager), instead of the browser's roughly one screen, so a fast flick doesn't reach empty photo boxes.
- Phones and tablets: blocks that fade in on scroll (`[data-reveal]`, v2's `[data-arrive]`) start just before they reach the screen (15% below it) and fade in .45 s instead of .9 s, so a fast flick never lands on a blank section. Desktop keeps the slower fade once a block is 8% onto the screen.
- v2 phones: the About Us statement lights up over a quarter of a screen of scrolling (its top from 75% to 50% down the screen) instead of about two thirds, and the introduction is fully in by 70% hero cover instead of 100% (it still starts at half).
- Phones and tablets: the header and the bottom bar have no frosted-glass blur (near-solid instead), since blurring the page under a fixed bar on every frame of scrolling is heavy work for a phone.
- Shadows: everything uses the review card's soft shadow. `--shadow-1` is for cards, photos and panels; `--shadow-2` is the slightly lifted version for card hover; `--shadow-pop` adds a hairline edge for menus and pop-ups; `--shadow-blue` is the soft glow under blue buttons. Use these tokens instead of new shadows.
- `prefers-reduced-motion` keeps the fades but drops zoom, slide and parallax effects. Same-page links then jump instead of gliding. Wheel smoothing and the header's slide stay on.
