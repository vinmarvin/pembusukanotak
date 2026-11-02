// src/core/board/shuffle.js
// Randomizes candy positions on the board and settles it so it is playable.
import { settle } from './settle.js';

export function shuffle(grid, rng) {
  const rows = grid.length;
  const cols = grid[0].length;
  const flat = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      flat.push(grid[r][c]);
    }
  }

  // Fisher-Yates shuffle
  for (let i = flat.length - 1; i > 0; i--) {
    const j = rng ? rng.gameInt(0, i) : Math.floor(Math.random() * (i + 1));
    const temp = flat[i];
    flat[i] = flat[j];
    flat[j] = temp;
  }

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid[r][c] = flat[idx++];
    }
  }

  return settle(grid, rng);
}

