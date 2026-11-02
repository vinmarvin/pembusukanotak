// src/core/board/hasMove.js
// Checks if at least one valid move (swap creating 3+ run) exists on the board.
import { findMatches } from './findMatches.js';

export function hasMove(grid) {
  const rows = grid.length;
  if (rows === 0) return false;
  const cols = grid[0].length;

  // Helper to swap and check
  function createsMatch(r1, c1, r2, c2) {
    const t1 = grid[r1][c1];
    const t2 = grid[r2][c2];
    if (!t1 || !t2 || t1.type === t2.type) return false;

    // Fast local match check around (r1, c1) and (r2, c2)
    grid[r1][c1] = t2;
    grid[r2][c2] = t1;

    const { matchedCells } = findMatches(grid);
    const valid = matchedCells.length > 0;

    grid[r1][c1] = t1;
    grid[r2][c2] = t2;
    return valid;
  }

  // Check horizontal swaps
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (createsMatch(r, c, r, c + 1)) return true;
    }
  }

  // Check vertical swaps
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      if (createsMatch(r, c, r + 1, c)) return true;
    }
  }

  return false;
}

