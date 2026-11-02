// src/core/board/gravity.js
// Drops candies downward to fill cleared spaces and spawns new candies from top.
import { GAMEPLAY } from '../../config/gameplay.config.js';

export function applyGravityAndRefill(grid, rng) {
  const rows = grid.length;
  const cols = grid[0].length;
  const candyTypes = GAMEPLAY.board.candyTypes || 6;

  const falls = [];
  const spawns = [];

  for (let c = 0; c < cols; c++) {
    // 1. Drop existing candies
    let writeRow = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (grid[r][c] !== null) {
        if (r !== writeRow) {
          const candy = grid[r][c];
          grid[writeRow][c] = candy;
          grid[r][c] = null;
          falls.push({ fromR: r, fromC: c, toR: writeRow, toC: c, candy });
        }
        writeRow--;
      }
    }

    // 2. Refill empty cells from top
    for (let r = writeRow; r >= 0; r--) {
      const type = rng ? rng.gameInt(0, candyTypes - 1) : Math.floor(Math.random() * candyTypes);
      const newCandy = { type, power: null };
      grid[r][c] = newCandy;
      spawns.push({ r, c, candy: newCandy });
    }
  }

  return { falls, spawns };
}

