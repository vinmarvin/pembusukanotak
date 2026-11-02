// src/core/combat/bossEffects.js
// Pure implementations of the 3 boss special effects.
import { shuffle } from '../board/shuffle.js';
import { applyGravityAndRefill } from '../board/gravity.js';
import { settle } from '../board/settle.js';
import { GAMEPLAY } from '../../config/gameplay.config.js';

export const BOSS_EFFECTS = ['shuffle', 'remove10', 'freeze'];

export function chooseBossEffect(rng) {
  if (rng && typeof rng.gameChoice === 'function') {
    return rng.gameChoice(BOSS_EFFECTS);
  }
  const idx = Math.floor(Math.random() * BOSS_EFFECTS.length);
  return BOSS_EFFECTS[idx];
}

export function applyBossEffect(effectType, grid, rng) {
  if (effectType === 'shuffle') {
    shuffle(grid, rng);
    return { type: 'shuffle', grid };
  }

  if (effectType === 'remove10') {
    const rows = grid.length;
    const cols = grid[0].length;
    const allCoords = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        allCoords.push({ r, c });
      }
    }

    // Pick 10 distinct coordinates
    const removeCount = Math.min(GAMEPLAY.bossEffects.removeCount || 10, allCoords.length);
    const chosen = [];
    for (let i = 0; i < removeCount; i++) {
      const idx = rng ? rng.gameInt(0, allCoords.length - 1) : Math.floor(Math.random() * allCoords.length);
      chosen.push(allCoords.splice(idx, 1)[0]);
    }

    for (const { r, c } of chosen) {
      grid[r][c] = null;
    }

    // Gravity and refill
    const { falls, spawns } = applyGravityAndRefill(grid, rng);
    settle(grid, rng);

    return {
      type: 'remove10',
      removedCells: chosen,
      falls,
      spawns,
      grid
    };
  }

  if (effectType === 'freeze') {
    return {
      type: 'freeze',
      durationSec: GAMEPLAY.bossEffects.freezeSec || 5
    };
  }

  return { type: 'none' };
}

