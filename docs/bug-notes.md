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
