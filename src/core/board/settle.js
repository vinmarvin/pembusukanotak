// src/core/board/settle.js
// Settles a grid so it has 0 existing matches and at least 1 valid swap move.
import { findMatches } from './findMatches.js';
import { hasMove } from './hasMove.js';
import { GAMEPLAY } from '../../config/gameplay.config.js';

export function settle(grid, rng) {
  const rows = grid.length;
  const cols = grid[0].length;
  const candyTypes = GAMEPLAY.board.candyTypes || 6;

  let iterations = 0;
  const maxIterations = 200;

  while (iterations++ < maxIterations) {
    const { matchedCells } = findMatches(grid);
    if (matchedCells.length === 0) {
      if (hasMove(grid)) {
        return grid;
      }
      // If no matches but no move, perturb a cell to create a move
      const r = rng ? rng.gameInt(0, rows - 1) : Math.floor(Math.random() * rows);
      const c = rng ? rng.gameInt(0, cols - 1) : Math.floor(Math.random() * cols);
      grid[r][c] = {
        type: rng ? rng.gameInt(0, candyTypes - 1) : Math.floor(Math.random() * candyTypes),
        power: null
      };
      continue;
    }

    // Eliminate matches by assigning a different type that doesn't match neighbors
    for (const { r, c } of matchedCells) {
      const forbidden = new Set();
      if (r > 0 && grid[r - 1][c]) forbidden.add(grid[r - 1][c].type);
      if (r < rows - 1 && grid[r + 1][c]) forbidden.add(grid[r + 1][c].type);
      if (c > 0 && grid[r][c - 1]) forbidden.add(grid[r][c - 1].type);
      if (c < cols - 1 && grid[r][c + 1]) forbidden.add(grid[r][c + 1].type);

      const available = [];
      for (let t = 0; t < candyTypes; t++) {
        if (!forbidden.has(t)) available.push(t);
      }

      const nextType = available.length > 0
        ? (rng ? rng.gameChoice(available) : available[0])
        : ((grid[r][c].type + 1) % candyTypes);

      grid[r][c] = { type: nextType, power: null };
    }
  }

  // Fallback: construct guaranteed valid setup in row 0
  grid[0][0] = { type: 0, power: null };
  grid[0][1] = { type: 1, power: null };
  grid[0][2] = { type: 0, power: null };
  grid[0][3] = { type: 0, power: null };

  return grid;
}

