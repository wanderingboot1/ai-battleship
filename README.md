# AI Battleship

Battleship in the browser against a themed AI opponent. Built by Blake with Devin.

**Play:** https://wanderingboot1.github.io/ai-battleship/

No login, install or API key needed. It works on desktop and mobile.

## What's in it
- **Three themed opponents:**
  - Admiral Edmund Hale (Classic Naval)
  - Navarch Gaius Magnus (Roman Navy)
  - Captain Calico Vane (Pirate Seas)

  The rules are the same for all three. Each has its own art, ship names and scripted banter, and banter can be turned off.
- **Two modes:**
  - **Classic:** standard Battleship.
  - **Special:** each side gets 3 random single-use abilities from a pool of 5: Recon, Flare, Broadside, Depth Charge and Torpedo. Scouting abilities (Recon, Flare) still let you take your shot; attack abilities replace it.
- **Placing ships:** tap to place and rotate ships, or auto-place them. No dragging is needed.
- **Effects:** hit, miss and sinking animations. With your device's reduced-motion setting on, these become simple fades.
- **Gold and pets:**
  - Each win earns 50 gold.
  - Spend it at the **Trading Post** on co-captain pets that carry and drop your shots: Parrot, Dragon, Sharky and Captain Dev.
  - Pets are cosmetic only and never change the odds.
- **Resume:** leave mid-game, or refresh the page, and the title screen offers to resume.

## How the AI works
The opponent is **conventional game logic, not an LLM**. No language model is called anywhere in the game.

- **Fair by design:** the AI only receives an `AIView` (`src/engine/aiView.ts`). That contains its own shot results, ships it has sunk, the lengths of ships still afloat, and its own scouting intel. It never sees where your ships are. A test checks that its decisions don't change when the hidden fleet does.
- **Heat map** (`src/ai/heatmap.ts`):
  - For every enemy ship still afloat, the AI lists every position the ship could legally occupy given what it knows.
  - Each open square is scored by how many of those positions cover it.
  - Ships may touch, so squares next to a sunk ship stay possible.
- **Hunting (no damaged ship):** the AI picks at random among squares where a ship could still fit. A positive Recon scan narrows that choice to the scanned area.
- **Targeting (a ship is damaged but not sunk):** positions that pass through more unresolved hits are weighted much more heavily. As a result, the AI follows the line of a damaged ship and works out which way it's facing.
- **Abilities** (`chooseAbility` in `src/ai/opponent.ts`) are chosen from the same heat map:
  - Broadside is saved for finishing off damaged ships.
  - Recon and Flare are used after the opening.
  - Depth Charge and Torpedo are aimed at the highest-scoring area or lane.
- **Difficulty:** the AI is competent but beatable. Over 600 simulated games, it averages about 55 shots to sink a random fleet (`npm run ai:stats`).

## Architecture
A static Vite + React + TypeScript app. There is no backend.

| Folder | Responsibility |
|---|---|
| `src/engine/` | Rules. `applyAction` is the only way to change a game. It rejects out-of-turn, duplicate, stale and invalid actions. Also contains abilities, placement, and the AI's view. |
| `src/ai/` | Heat-map search and the AI's ability choices. |
| `src/themes/` | Theme data (names, colors, dialogue) and SVG avatars and ships. |
| `src/pets/` | Wallet rules (rewards, buying, equipping) and pet art. |
| `src/ui/` | React screens and components; browser storage (`storage.ts`). |
| `e2e/` | Playwright browser tests (desktop and phone sizes). |

## Development
Requires Node.js 22+.

```bash
npm ci                              # install exact dependency versions
npm run dev                         # local dev server
npm run check                       # lint + typecheck + unit tests
npm run build                       # production build into dist/
npx playwright install chromium     # once, before browser tests
npm run test:e2e                    # Playwright browser tests (builds and serves the app)
```

## Deployment
GitHub Pages, via GitHub Actions.
- Every push to `main` runs the checks, builds, and deploys (`.github/workflows/deploy.yml`). It then smoke-tests the live URL.
- Pull requests run `.github/workflows/ci.yml`.
- The page footer shows the deployed commit.

## Assets and licenses
All artwork (avatars, ships, pets, board markers, effects) is original SVG drawn in code. Third-party fonts are self-hosted via [Fontsource](https://fontsource.org):

| Font | Used for | License |
|---|---|---|
| [Black Ops One](https://fonts.google.com/specimen/Black+Ops+One) | Classic Naval headings | SIL Open Font License 1.1 |
| [Cinzel](https://fonts.google.com/specimen/Cinzel) | Roman Navy headings | SIL Open Font License 1.1 |
| [Pirata One](https://fonts.google.com/specimen/Pirata+One) | Pirate Seas headings | SIL Open Font License 1.1 |
