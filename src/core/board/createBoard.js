// src/core/board/createBoard.js
// Initializes a match-3 board with no initial matches and at least one valid move.
import { GAMEPLAY } from '../../config/gameplay.config.js';
import { settle } from './settle.js';

export function createBoard(cols, rows, rng) {
  const candyTypes = GAMEPLAY.board.candyTypes || 6;
  const grid = [];

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const type = rng ? rng.gameInt(0, candyTypes - 1) : Math.floor(Math.random() * candyTypes);
      row.push({ type, power: null });
    }
    grid.push(row);
  }

  return settle(grid, rng);
}

