# Marjan Travel & Tours: logo files

All logos are vector SVG. The same set is laid out for client review in Figma: file "Task For Ai", page **Marjan**.

Local preview: start the `.claude/launch.json` config `marjan-logo`, then open http://localhost:4322/board.html.

## Files (`svg/`)

| # | File | What it is |
| --- | --- | --- |
| 01–02 | `client-logo-tagline`, `client-logo-lines` | The client's current logo, rebuilt as vector in its original blue/navy colours |
| 03–04 | `client-logo-coral-*` | The same shapes in the website palette (coral and deep sea) |
| 05–07 | `A-coral` (+ reversed, icon) | New direction A: a branching red coral (Marjan means coral) |
| 08–10 | `B-route` (+ reversed, icon) | New direction B: an M drawn as a travel route ending in a destination pin |
| 11–13 | `C-gateway` (+ reversed, icon) | New direction C: an arch window with sun, mountains and sea |
| 14–16 | `D-seal` (+ reversed, icon) | New direction D: a passport-stamp seal carrying the tagline |

The "reversed" files include their own dark (#0B2429) background. The icon files are 512 × 512 app or social tiles.

## Typefaces

- **Client logo (closest match):**
  - "Marjan": Poppins ExtraBold Italic with tight tracking (about −100).
  - "TRAVEL & TOURS": Poppins Bold.
  - Tagline: Poppins SemiBold Italic.
  - The original lettering looks custom-drawn, so these fonts are the nearest match, not the exact source.
- **New directions:** Fraunces and Plus Jakarta Sans, the website fonts. All lettering in the SVGs is already outlined, so no fonts need to be installed.

## Regenerating

`source/` holds the scripts that made these files. Running them needs Node, plus `npm install potrace@2.1.8 opentype.js@1.3.4 @fontsource/fraunces @fontsource/plus-jakarta-sans` run inside `source/`.

- `trace.js` traces `reference/*.jpg` into colour layers and writes `trace-*.json`.
- `assemble.js` builds files 01–04 from those layers, with one palette per colourway.
- `directions.js` builds files 05–16.
