# Bug notes (working log)

Raw notes on real defects found during development. These get condensed into `DEBUGGING.md` at the end.

## 1. AI follow-up test failed after two adjacent hits (M1, found by unit test; recheck details before DEBUGGING.md)
- **Plain English:** after hitting a ship twice in a row, the AI sometimes fired off to the side instead of continuing along the line.
- **Repro:** `src/ai/opponent.test.ts` orientation test: hits at E4 and E5 (cells 44, 45). Expected next shot E3 or E6; got D5 (35).
- **Root cause:** in target mode, positions covering one hit and positions covering both hits were weighted too similarly, so a perpendicular cell could outscore the line.
- **Fix:** weight positions by `targetWeight ** hitsCovered` (default `targetWeight: 4`) so lines through both hits dominate.
- **Verified:** orientation test passes; 600-game simulation still has no invalid or duplicate shots.

## 2. Board rows had uneven heights when ships were drawn (M2, found by screenshot review)
- **Plain English:** on your own board, rows containing a ship were taller than empty rows, so the grid looked squashed and misaligned.
- **Repro:** start any battle on desktop and look at "Your fleet": rows with horizontal ships were visibly taller.
- **Root cause:** the grid used `1fr` tracks, whose minimum size is the content's size; the ship SVGs asked for more height than one cell, so CSS grew those rows.
- **Fix:** use `minmax(0, 1fr)` tracks and let ship SVGs shrink (`min-height: 0`).
- **Verified:** re-took desktop and mobile screenshots for all three themes; rows are equal.

## 3. Horizontal ships looked shorter than their length (first playtest, found by Blake)
- **Plain English:** a five-square ship placed sideways only covered about two squares, but looked correct when placed upright.
- **Repro:** Roman Navy → place the Quinquereme horizontally on row J. The drawing covered roughly 2 of its 5 squares; rotating to vertical covered all 5.
- **Expected:** the drawn ship spans exactly the squares it occupies, in either orientation.
- **Root cause:** each ship had `padding: 6%`. In CSS, percentage padding is always measured from the element's *width*, even for top and bottom. A horizontal ship's box is five cells wide, so the padding ate most of its one-cell height, and the drawing (which keeps its proportions) shrank to fit. A vertical ship's box is one cell wide, so its padding was tiny and nothing looked wrong.
- **Fix:** removed the padding; the ship artwork already has its own margin built in (`src/styles.css`).
- **Verified:** new Playwright test "ships fill their squares in both orientations" measures the drawn hull: it failed before the fix (89px drawn vs a required 206px for a 5-cell ship) and passes after, on desktop and mobile. Re-took screenshots for all themes. Full suite: lint, typecheck, 26 unit tests, 12/12 browser tests.
- **Why tests missed it:** the earlier browser tests checked behaviour (placement, firing), not drawing size. The short ships were visible in my own screenshot review, but I missed them.

## 4. AI ignored positive Recon results (Special mode, found by automated code review)
- **Plain English:** when the AI's scan said "there are ships here", it didn't actually aim there next; it only used scans that came back empty.
- **Repro:** give the AI a Recon result of 2 around B2 on an untouched board and ask for its next shot: it picked from the whole board.
- **Expected:** the next hunting shot lands inside the scanned area.
- **Root cause:** recon boosted heat-map scores, but hunt mode samples every plausible cell with equal weight (`huntSharpness: 0`, tuned for difficulty), so the boost was flattened away.
- **Fix:** `computeHeatmap` returns `focus` (plausible cells in scans that still hold ships); hunt mode samples only from `focus` when it exists.
- **Verified:** new unit test (30 seeds, every shot inside the 3×3 area); Special-mode AI-vs-AI simulation still passes.

## 5. Two open tabs could erase each other's gold and pets (Trading Post, found by automated code review)
- **Plain English:** with the game open in two tabs, buying something in one tab and then the other could wipe out the first purchase.
- **Repro:** two tabs with 150 gold; tab A buys Dragon, tab B (still showing 150) buys Parrot; reload tab A: Dragon is gone.
- **Root cause:** each tab kept its own copy of the wallet and saved the whole copy after every change, overwriting newer data from the other tab.
- **Fix:** every change re-reads the saved wallet before applying and saving, and tabs listen for each other's `storage` updates.
- **Verified:** new two-tab Playwright test; both pets remain owned after reload.
