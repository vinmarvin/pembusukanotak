// src/core/board/applyPowerUp.js
// Resolves effects when a power-up candy triggers in match or tap.
import { GAMEPLAY } from '../../config/gameplay.config.js';

export function applyPowerUp(grid, r, c, powerType, rng) {
  const rows = grid.length;
  const cols = grid[0].length;
  const clearedSet = new Set();
  const effects = [];

  if (powerType === 'line') {
    const cellItem = grid[r]?.[c];
    const isHorizontal = cellItem?.orientation ? cellItem.orientation === 'h' : (rng ? rng.game() < 0.5 : true);
    if (isHorizontal) {
      for (let col = 0; col < cols; col++) {
        clearedSet.add(`${r},${col}`);
      }
      effects.push({ type: 'line', orientation: 'h', row: r });
    } else {
      for (let row = 0; row < rows; row++) {
        clearedSet.add(`${row},${c}`);
      }
      effects.push({ type: 'line', orientation: 'v', col: c });
    }
  } else if (powerType === 'bomb') {
    // 4x4 area shifted to stay inside board bounds
    const size = GAMEPLAY.timeKill.bombSize || 4;
    let startR = r - Math.floor(size / 2);
    let startC = c - Math.floor(size / 2);

    if (startR + size > rows) startR = rows - size;
    if (startR < 0) startR = 0;
    if (startC + size > cols) startC = cols - size;
    if (startC < 0) startC = 0;

    for (let row = startR; row < Math.min(rows, startR + size); row++) {
      for (let col = startC; col < Math.min(cols, startC + size); col++) {
        clearedSet.add(`${row},${col}`);
      }
    }
    effects.push({ type: 'bomb', startR, startC, size });
  } else if (powerType === 'freeze') {
    clearedSet.add(`${r},${c}`);
    effects.push({ type: 'freeze', durationSec: GAMEPLAY.timeKill.freezeSec });
  } else if (powerType === 'x5') {
    clearedSet.add(`${r},${c}`);
    effects.push({
      type: 'x5',
      multiplier: GAMEPLAY.timeKill.scoreMultiplier,
      durationSec: GAMEPLAY.timeKill.scoreMultiplierSec
    });
  }

  const cleared = Array.from(clearedSet).map((key) => {
    const [row, col] = key.split(',').map(Number);
    return { r: row, c: col };
  });

  return { cleared, effects };
}

