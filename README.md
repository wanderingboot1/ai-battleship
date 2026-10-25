# AI Battleship

Battleship in the browser against a themed AI opponent. Built by Blake with Devin.

**Play:** https://wanderingboot1.github.io/ai-battleship/ (work in progress)

## Development

Requires Node.js 22+.

```bash
npm ci            # install exact dependency versions from package-lock.json
npm run dev       # local dev server
npm run check     # lint + typecheck + unit tests
npm run build     # production build into dist/
npm run test:e2e  # Playwright browser tests (run `npx playwright install chromium` once first)
```

## Deployment

Static site on GitHub Pages. Every push to `main` runs the checks, builds, deploys via `.github/workflows/deploy.yml`, then smoke-tests the live URL. Pull requests run `.github/workflows/ci.yml`.

## Assets and licenses

All artwork (avatars, ships, board markers) is original SVG drawn in code. Third-party fonts, self-hosted via [Fontsource](https://fontsource.org):

| Font | Used for | License |
|---|---|---|
| [Black Ops One](https://fonts.google.com/specimen/Black+Ops+One) | Classic Naval headings | SIL Open Font License 1.1 |
| [Cinzel](https://fonts.google.com/specimen/Cinzel) | Roman Navy headings | SIL Open Font License 1.1 |
| [Pirata One](https://fonts.google.com/specimen/Pirata+One) | Pirate Seas headings | SIL Open Font License 1.1 |
