# Marjan Travel & Tours website

Two people work on this repo, each with their own Claude. Follow these rules so work doesn't collide.

## Workflow
- Never commit or push directly to `main`. For every change: create a branch, push it, open a pull request.
- Run `git pull` on `main` before starting a new branch.
- Keep pull requests small and focused on one area.
- Live: the site is public at https://marjantravels.com/ (launched 25 Nov 2026) and indexed. Old https://marjantravels.com/design-branch/... preview links 301-redirect to the real pages (`website/src/_redirects`).

## Project
- Static site, no dependencies. Source in `website/src`, see `website/README.md` for structure and shortcodes.
- Build: `node website/build.mjs` (writes `website/dist`, which is gitignored; never edit `dist` directly).
- Deploy: Cloudflare Worker `marjan` (assets only), configured in `wrangler.jsonc` (static assets from `website/dist`, custom domains marjantravels.com and www). Keep links in the source root-relative (`/contact-us/`). The build also writes `sitemap.xml` and copies `robots.txt`, `llms.txt` and `_redirects`. Deploys are run by the repo owner with `npx wrangler deploy` (it builds first).
- Page copy lives in `Website-Content/*.docx`; logo work in `logo/`.

## Before launch
See the "Before launch" checklist in `website/README.md` (placeholders, devpill switch, sample reviews, photos, logo).
