# Marjan Travel & Tours website

Two people work on this repo, each with their own Claude. Follow these rules so work doesn't collide.

## Workflow
- Never commit or push directly to `main`. For every change: create a branch, push it, open a pull request.
- Run `git pull` on `main` before starting a new branch.
- Keep pull requests small and focused on one area.
- `main` is live: every merge to `main` deploys to https://marjantravels.com.

## Project
- Static site, no dependencies. Source in `website/src`, see `website/README.md` for structure and shortcodes.
- Build: `node website/build.mjs` (writes `website/dist`, which is gitignored; never edit `dist` directly).
- Deploy: Cloudflare Worker `marjan`, configured in `wrangler.jsonc` (static assets from `website/dist`, custom domains marjantravels.com and www).
- Page copy lives in `Website-Content/*.docx`; logo work in `logo/`.

## Before launch
See the "Before launch" checklist in `website/README.md` (placeholders, devpill switch, sample reviews, photos, logo).
