# Debugging notes

Real defects found while building AI Battleship, and how each was fixed. One was found by Blake during his first playtest. The rest were caught by automated tests, screenshot review, or automated code review. No hypothetical bugs are listed.

## 1. Horizontal ships drawn shorter than their length (found by Blake in playtest)
- **In plain English:** a five-square ship placed sideways only covered about two squares. Placed upright, it looked correct.
- **Repro:** Roman Navy → place the Quinquereme horizontally on row J. The drawing covered roughly 2 of its 5 squares.
- **Expected:** the drawing spans exactly the squares the ship occupies, in either orientation.
- **Root cause:** each ship had `padding: 6%`. In CSS, percentage padding is measured from the element's *width*, even for top and bottom. A horizontal ship's box is five cells wide, so the padding took up most of its one-cell height. The drawing keeps its proportions, so it shrank to fit.
- **Fix:** removed the padding (the artwork already has its own margin).
- **Verified:** a new browser test measures the drawn hull. Before the fix it failed (89px drawn, 206px required); after the fix it passes on desktop and mobile. Also re-checked with screenshots of every theme and in a recording on the live site.

## 2. Board rows had uneven heights (found by screenshot review)
- **In plain English:** on your own board, rows containing a ship were taller than empty rows, so the grid looked squashed.
- **Root cause:** the grid tracks were `1fr`, whose minimum size is the size of their content. The ship drawings asked for more than one cell of height, so those rows grew.
- **Fix:** `minmax(0, 1fr)` tracks, and ship drawings that are allowed to shrink.
- **Verified:** desktop and mobile screenshots for all three themes show equal rows.

## 3. AI fired off to the side after two hits in a line (found by unit test)
- **In plain English:** after hitting a ship twice in a row, the AI sometimes fired beside the line instead of continuing along it.
- **Repro:** with hits at E4 and E5, the next shot should be E3 or E6. The AI chose D5.
- **Root cause:** in target mode, ship positions covering one hit were weighted almost the same as positions covering both hits.
- **Fix:** each extra hit a position covers multiplies its weight, so lines through both hits dominate.
- **Verified:** the orientation test passes, and a 600-game simulation still makes no invalid or duplicate shots.

## 4. AI ignored positive Recon results (Special mode, found by automated code review)
- **In plain English:** when the AI's scan said "there are ships here", it didn't aim there next. It only used scans that came back empty.
- **Root cause:** Recon raised the heat-map scores in the scanned area. However, to keep the AI beatable, its search picks between all plausible squares with equal weight, which cancelled the boost out.
- **Fix:** the heat map now returns a `focus` list: open squares inside scans that still contain ships. The search shoots there first.
- **Verified:** a new unit test checks 30 random seeds: after a positive scan, every next shot lands inside the scanned 3×3 area.

## 5. Two open tabs could erase each other's gold and pets (Trading Post, found by automated code review)
- **In plain English:** with the game open in two tabs, buying a pet in one tab and then another in the second could wipe out the first purchase.
- **Root cause:** each tab kept its own copy of the wallet and saved the whole copy after every change, overwriting newer data from the other tab.
- **Fix:** every change re-reads the saved wallet before applying itself. Tabs also listen for each other's `storage` updates. If saving fails, the game keeps using the in-memory wallet so purchases aren't undone.
- **Verified:** a new two-tab browser test confirms both pets are still owned after a reload.

## Remaining limitations
- Gold, pets, settings and the resumable game are saved in the player's own browser. Clearing site data or switching devices starts over, because there are no accounts or servers.
- Only one unfinished game is saved at a time. With two different games open in two tabs, only the most recently played one can be resumed.
- There is one AI difficulty level, and no sound.
