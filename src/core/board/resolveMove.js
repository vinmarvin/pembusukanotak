// src/core/board/resolveMove.js
// Resolves a player swap or board resolution loop deterministically with cascading steps.
import { GAMEPLAY } from '../../config/gameplay.config.js';
import { findMatches } from './findMatches.js';
import { applyPowerUp } from './applyPowerUp.js';
import { applyGravityAndRefill } from './gravity.js';
import { settle } from './settle.js';
import { shuffle } from './shuffle.js';
import { hasMove } from './hasMove.js';

export function resolveMove(grid, move, rng, options = {}) {
  const { r1, c1, r2, c2 } = move;
  const isTimeKill = options.isTimeKill ?? false;
  const hardChainCap = GAMEPLAY.board.hardChainCap || 60;
  const scorePerCandy = GAMEPLAY.board.scorePerCandy || 100;
  const powerUpsList = ['line', 'bomb', 'freeze', 'x5'];

  // Check adjacency
  const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);
  if (dist !== 1) {
    return { valid: false };
  }

  // Swap
  const candy1 = grid[r1][c1];
  const candy2 = grid[r2][c2];
  grid[r1][c1] = candy2;
  grid[r2][c2] = candy1;

  // Step 0 match check
  const initialMatches = findMatches(grid);
  if (initialMatches.matchedCells.length === 0) {
    // Revert swap
    grid[r1][c1] = candy1;
    grid[r2][c2] = candy2;
    return { valid: false };
  }

  const steps = [];
  let stepIndex = 0;
  let powerSpawned = null;

  while (stepIndex < hardChainCap) {
    const { matchedCells, runs, longestRun } = findMatches(grid);
    if (matchedCells.length === 0) {
      break;
    }

    // Time Kill Decision 13: 4+ match in step 0 turns the candy moved into a random powerup
    let createdPowerUpCell = null;
    if (stepIndex === 0 && isTimeKill && longestRun >= 4) {
      // The candy the player moved (r2, c2) gets the power-up if part of the match, else (r1, c1)
      const target = matchedCells.find((m) => m.r === r2 && m.c === c2) ||
                     matchedCells.find((m) => m.r === r1 && m.c === c1) ||
                     matchedCells[0];
      const randomPower = rng ? rng.gameChoice(powerUpsList) : 'bomb';
      const matchingRun = runs.find((run) => run.cells.some((cell) => cell.r === target.r && cell.c === target.c));
      const orientation = matchingRun?.orientation || (rng && rng.game() < 0.5 ? 'h' : 'v');
      createdPowerUpCell = { ...target, power: randomPower, orientation };
      powerSpawned = createdPowerUpCell;
    }

    // Determine all cleared cells (matches + triggered power-ups)
    const clearedMap = new Map();
    const powerEvents = [];
    const triggeredPowers = new Set();

    // Add initial matched cells
    for (const cell of matchedCells) {
      const key = `${cell.r},${cell.c}`;
      clearedMap.set(key, { ...cell, candy: grid[cell.r][cell.c] });
    }

    // Trigger powerups in the cleared set (each triggers once per step)
    const queue = [...clearedMap.values()];
    while (queue.length > 0) {
      const item = queue.shift();
      const pKey = `${item.r},${item.c}`;
      if (item.candy && item.candy.power && !triggeredPowers.has(pKey)) {
        triggeredPowers.add(pKey);
        const { cleared: extraCleared, effects } = applyPowerUp(
          grid,
          item.r,
          item.c,
          item.candy.power,
          rng
        );
        powerEvents.push(...effects);

        for (const ec of extraCleared) {
          const ek = `${ec.r},${ec.c}`;
          if (!clearedMap.has(ek)) {
            const entry = { ...ec, candy: grid[ec.r][ec.c] };
            clearedMap.set(ek, entry);
            queue.push(entry);
          }
        }
      }
    }

    // If a powerup was created on (r, c) this step, do not remove that cell from grid; upgrade it instead!
    const clearedList = [];
    for (const [key, entry] of clearedMap.entries()) {
      if (
        createdPowerUpCell &&
        entry.r === createdPowerUpCell.r &&
        entry.c === createdPowerUpCell.c
      ) {
        // Upgrade this candy with power instead of destroying
        grid[entry.r][entry.c].power = createdPowerUpCell.power;
        grid[entry.r][entry.c].orientation = createdPowerUpCell.orientation;
      } else {
        grid[entry.r][entry.c] = null;
        clearedList.push(entry);
      }
    }

    // Apply gravity and refill
    const { falls, spawns } = applyGravityAndRefill(grid, rng);

    steps.push({
      index: stepIndex,
      cleared: clearedList,
      scoreRaw: clearedList.length * scorePerCandy,
      longestRun,
      runs,
      falls,
      spawns,
      powerEvents,
      powerSpawned: stepIndex === 0 ? powerSpawned : null
    });

    stepIndex++;
  }

  // If hardChainCap reached, settle to break endless cycle
  if (stepIndex >= hardChainCap) {
    settle(grid, rng);
  }

  // Check if at least one move remains; if not, reshuffle for free (Decision 10)
  let reshuffled = false;
  if (!hasMove(grid)) {
    shuffle(grid, rng);
    reshuffled = true;
  }

  return {
    valid: true,
    steps,
    grid,
    reshuffled
  };
}

